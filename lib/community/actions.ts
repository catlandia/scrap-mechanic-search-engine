"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import {
  commentVotes,
  comments,
  creationCategories,
  creations,
  creationTags,
  creationVotes,
  favorites,
  reports,
  REPORT_REASONS,
  tagVotes,
  tags,
  users,
  type ReportReason,
} from "@/lib/db/schema";
import { effectiveRole, isModerator } from "@/lib/auth/roles";
import {
  detectKind,
  fetchWorkshopContributors,
  getPublishedFileDetails,
  resolvePlayerNames,
  steamUrlFor,
  SCRAP_MECHANIC_APPIDS,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";
import { classify } from "@/lib/tagger/classify";
import {
  countReportsByUserForCreationSince,
  countReportsByUserSince,
  countSubmissionsByUserSince,
  isInMemoryRateLimited,
} from "@/lib/rate-limit";
import { broadcastToRole, createNotification } from "@/lib/db/notifications";

const MIN_STEAM_AGE_DAYS = 7;

/**
 * Turn gate error codes into messages safe to show the user. Keeps the thrown
 * codes short and machine-readable while the UI stays readable.
 */
function friendlyGateError(code: string): string {
  switch (code) {
    case "signed_out":
      return "You need to sign in with Steam first.";
    case "banned":
      return "Your account is currently banned.";
    case "muted":
      return "Your account is currently muted.";
    case "steam_too_new":
      return "Your Steam account needs to be at least 7 days old. This cooldown prevents fresh accounts from spamming the site — moderators can't bypass it, just wait it out.";
    case "steam_age_unknown":
      return "We couldn't verify your Steam account age because your Steam profile is private. Make your profile public, or send a moderator an appeal at /verify/appeal and they'll flip the gate on your account.";
    default:
      return code;
  }
}

async function requireVotingUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  const now = Date.now();
  if (user.bannedUntil && user.bannedUntil.getTime() > now) {
    throw new Error("banned");
  }
  if (user.mutedUntil && user.mutedUntil.getTime() > now) {
    throw new Error("muted");
  }
  if (!user.bypassAgeGate) {
    if (!user.steamCreatedAt) {
      // Private Steam profile → we can't verify age, so treat as young.
      // Creator can flip bypassAgeGate for trusted users via /admin/users.
      throw new Error("steam_age_unknown");
    }
    const ageDays = (now - user.steamCreatedAt.getTime()) / 86_400_000;
    if (ageDays < MIN_STEAM_AGE_DAYS) {
      throw new Error("steam_too_new");
    }
  }
  return user;
}

async function recomputeSiteVoteScore(creationId: string) {
  const db = getDb();
  const rows = await db
    .select({ value: creationVotes.value })
    .from(creationVotes)
    .where(eq(creationVotes.creationId, creationId));

  let up = 0;
  let down = 0;
  for (const r of rows) {
    if (r.value > 0) up += 1;
    else if (r.value < 0) down += 1;
  }

  await db
    .update(creations)
    .set({ siteWeightedUp: up, siteWeightedDown: down })
    .where(eq(creations.id, creationId));

  return { up, down, net: up - down };
}

export async function toggleFavourite(
  creationId: string,
): Promise<{ favourited: boolean }> {
  const user = await requireVotingUser();
  // 30 toggles / 60s / user — covers double-click spam without punishing normal use.
  if (isInMemoryRateLimited(`fav:${user.steamid}`, 30, 60_000)) {
    throw new Error("rate_limited");
  }
  const db = getDb();
  const existing = await db
    .select()
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, user.steamid),
        eq(favorites.creationId, creationId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, user.steamid),
          eq(favorites.creationId, creationId),
        ),
      );
    revalidatePath(`/creation/${creationId}`);
    revalidatePath("/me/favourites");
    return { favourited: false };
  }

  await db.insert(favorites).values({ userId: user.steamid, creationId });
  revalidatePath(`/creation/${creationId}`);
  revalidatePath("/me/favourites");
  return { favourited: true };
}

export async function voteCreation(
  creationId: string,
  value: -1 | 0 | 1,
): Promise<void> {
  const user = await requireVotingUser();
  // 30 votes / 60s / user — well above organic use, still bounds script-driven abuse.
  if (isInMemoryRateLimited(`voteCreation:${user.steamid}`, 30, 60_000)) {
    throw new Error("rate_limited");
  }
  const db = getDb();

  const [existing] = await db
    .select({ value: creationVotes.value })
    .from(creationVotes)
    .where(
      and(
        eq(creationVotes.userId, user.steamid),
        eq(creationVotes.creationId, creationId),
      ),
    )
    .limit(1);

  if (value === 0 && !existing) return;
  if (value !== 0 && existing && existing.value === value) return;

  if (value === 0) {
    await db
      .delete(creationVotes)
      .where(
        and(
          eq(creationVotes.userId, user.steamid),
          eq(creationVotes.creationId, creationId),
        ),
      );
  } else {
    await db
      .insert(creationVotes)
      .values({ userId: user.steamid, creationId, value })
      .onConflictDoUpdate({
        target: [creationVotes.userId, creationVotes.creationId],
        set: { value, createdAt: new Date() },
      });
  }

  const { net } = await recomputeSiteVoteScore(creationId);

  if (net <= -5) {
    const existingOpen = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.creationId, creationId),
          eq(reports.source, "auto"),
          eq(reports.status, "open"),
        ),
      )
      .limit(1);
    if (existingOpen.length === 0) {
      await db.insert(reports).values({
        creationId,
        reason: "poor_quality",
        source: "auto",
        status: "open",
        customText: `Auto-report: site weighted net score fell to ${net}.`,
      });
    }
  }

  revalidatePath(`/creation/${creationId}`);
  // Public pages show orange stars; refresh their feeds so the new score sticks.
  revalidatePath("/");
  revalidatePath("/new");
}

export async function reportCreation(formData: FormData): Promise<void> {
  const user = await requireVotingUser();
  const db = getDb();

  const creationId = String(formData.get("creationId") ?? "");
  if (!creationId) throw new Error("creationId required");

  const reasonRaw = String(formData.get("reason") ?? "other");
  const reason: ReportReason = (REPORT_REASONS as readonly string[]).includes(
    reasonRaw,
  )
    ? (reasonRaw as ReportReason)
    : "other";

  // 1000 chars is the public comment ceiling; reports shouldn't need more.
  const customText = String(formData.get("customText") ?? "").trim().slice(0, 1000);
  if (reason === "other" && !customText) {
    throw new Error("custom_text_required");
  }

  // One report per user per creation per 24h — stops a single user flooding
  // the same item — plus 5 reports per user per 24h cap overall.
  const dupe = await countReportsByUserForCreationSince(
    user.steamid,
    creationId,
    24 * 60 * 60,
  );
  if (dupe > 0) throw new Error("already_reported");
  const dailyTotal = await countReportsByUserSince(user.steamid, 24 * 60 * 60);
  if (dailyTotal >= 5) throw new Error("rate_limited: 5 reports per 24h");

  await db.insert(reports).values({
    creationId,
    reporterUserId: user.steamid,
    reason,
    customText: customText || null,
    source: "user",
    status: "open",
  });

  // Fan the blue bell: every moderator+ gets pinged that a new report landed.
  // Lookup title/shortId here so the notification has actionable context; the
  // report insert succeeded already so a missing creation row is just a noisy
  // title, not a blocker.
  const [creationRow] = await db
    .select({ shortId: creations.shortId, title: creations.title })
    .from(creations)
    .where(eq(creations.id, creationId))
    .limit(1);
  if (creationRow) {
    await broadcastToRole({
      minRole: "moderator",
      tier: "moderator",
      type: "mod_new_report",
      title: `New report on "${creationRow.title}"`,
      body: `Reason: ${reason}${customText ? ` — ${customText.slice(0, 160)}` : ""}`,
      link: `/admin/reports`,
      excludeUserId: user.steamid,
    });
  }

  revalidatePath(`/creation/${creationId}`);
  revalidatePath("/admin/reports");
}

export async function reportComment(formData: FormData): Promise<void> {
  const user = await requireVotingUser();
  const db = getDb();

  const commentIdRaw = String(formData.get("commentId") ?? "");
  const commentId = Number(commentIdRaw);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    throw new Error("invalid_comment_id");
  }

  const reasonRaw = String(formData.get("reason") ?? "other");
  const reason: ReportReason = (REPORT_REASONS as readonly string[]).includes(
    reasonRaw,
  )
    ? (reasonRaw as ReportReason)
    : "other";
  const customText = String(formData.get("customText") ?? "").trim().slice(0, 1000);
  if (reason === "other" && !customText) {
    throw new Error("custom_text_required");
  }

  const [row] = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!row) throw new Error("comment_not_found");
  if (row.deletedAt) throw new Error("comment_deleted");
  if (row.userId === user.steamid) throw new Error("cannot_self_report");

  // One report per user per comment per 24h. Simpler than creations: a
  // comment has no duplicate-target-across-reporters concern to dedupe.
  const [dupe] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.commentId, commentId),
        eq(reports.reporterUserId, user.steamid),
        sql`${reports.createdAt} > now() - interval '24 hours'`,
      ),
    );
  if ((dupe?.n ?? 0) > 0) throw new Error("already_reported");

  // Daily total cap shared with creation reports — 5/day across both.
  const dailyTotal = await countReportsByUserSince(user.steamid, 24 * 60 * 60);
  if (dailyTotal >= 5) throw new Error("rate_limited: 5 reports per 24h");

  await db.insert(reports).values({
    commentId,
    reporterUserId: user.steamid,
    reason,
    customText: customText || null,
    source: "user",
    status: "open",
  });

  await broadcastToRole({
    minRole: "moderator",
    tier: "moderator",
    type: "mod_new_report",
    title: "New report on a comment",
    body: `Reason: ${reason}${customText ? ` — ${customText.slice(0, 160)}` : ""}`,
    link: "/admin/reports",
    excludeUserId: user.steamid,
  });

  revalidatePath("/admin/reports");
}

/**
 * Community tag nomination: adds a +1 vote on a tag that may or may not be
 * present on this creation yet. If no creation_tags row exists, one is
 * created with source='community' and confirmed=false — the tag only
 * appears publicly once it has +3 net community votes OR an admin confirms.
 */
export async function suggestTag(formData: FormData): Promise<void> {
  const user = await requireVotingUser();
  // 10 nominations per user per hour — creating new creation_tags rows is
  // cheap but unbounded nomination would let one user seed spam tags.
  if (isInMemoryRateLimited(`suggestTag:${user.steamid}`, 10, 60 * 60 * 1000)) {
    throw new Error("rate_limited");
  }
  const db = getDb();

  const creationId = String(formData.get("creationId") ?? "");
  const tagSlug = String(formData.get("tagSlug") ?? "").trim();
  if (!creationId) throw new Error("creationId required");
  if (!tagSlug) throw new Error("tagSlug required");

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.slug, tagSlug))
    .limit(1);
  if (!tag) throw new Error("unknown_tag");

  await db
    .insert(creationTags)
    .values({
      creationId,
      tagId: tag.id,
      source: "community",
      confidence: null,
      confirmed: false,
      rejected: false,
    })
    .onConflictDoNothing();

  await db
    .insert(tagVotes)
    .values({
      userId: user.steamid,
      creationId,
      tagId: tag.id,
      value: 1,
    })
    .onConflictDoUpdate({
      target: [tagVotes.userId, tagVotes.creationId, tagVotes.tagId],
      set: { value: 1, createdAt: new Date() },
    });

  revalidatePath(`/creation/${creationId}`);
}

const MAX_COMMENT_LENGTH = 2000;
// Tree depth allowed: 0 (root) / 1 (reply) / 2 (sub-reply). Beyond two
// indentation steps the column gets too narrow to be readable on mobile.
const MAX_REPLY_DEPTH = 2;

export async function postComment(formData: FormData): Promise<void> {
  const user = await requireVotingUser();
  const creationId = String(formData.get("creationId") ?? "") || null;
  const profileSteamid = String(formData.get("profileSteamid") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim();
  const parentIdRaw = formData.get("parentId");
  const parentId =
    parentIdRaw != null && String(parentIdRaw) !== ""
      ? Number(parentIdRaw)
      : null;
  if (parentId != null && (!Number.isInteger(parentId) || parentId <= 0)) {
    throw new Error("invalid_parent_id");
  }

  // XOR enforced by schema, but surface a friendly error before hitting the DB.
  if ((creationId && profileSteamid) || (!creationId && !profileSteamid)) {
    throw new Error("invalid_target");
  }
  if (!body) throw new Error("body_empty");
  if (body.length > MAX_COMMENT_LENGTH) throw new Error("body_too_long");

  const db = getDb();

  // Verify the target is something the user is allowed to post on. Without
  // this, a determined user could post to a pending/archived/rejected
  // creation by crafting a direct action call (the UI doesn't expose the
  // path, but the server action is reachable). FK already handles the
  // "nonexistent" case.
  if (creationId) {
    const [target] = await db
      .select({ status: creations.status })
      .from(creations)
      .where(eq(creations.id, creationId))
      .limit(1);
    if (!target || target.status !== "approved") {
      throw new Error("target_not_postable");
    }
  } else if (profileSteamid) {
    const [owner] = await db
      .select({ hardBanned: users.hardBanned })
      .from(users)
      .where(eq(users.steamid, profileSteamid))
      .limit(1);
    if (!owner) throw new Error("target_not_postable");
    // Hard-banned owners lose their wall — they can't see anything on this
    // site anyway, and their wall shouldn't accept new posts.
    if (owner.hardBanned) throw new Error("target_not_postable");
  }

  // Rate limit: 1 comment per 30 seconds per user.
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.userId, user.steamid),
        sql`${comments.createdAt} > now() - interval '30 seconds'`,
      ),
    );
  if ((recent?.n ?? 0) > 0) {
    throw new Error("rate_limited: wait 30s between comments");
  }

  let parentAuthorId: string | null = null;
  if (parentId != null) {
    const [parent] = await db
      .select({
        id: comments.id,
        creationId: comments.creationId,
        profileSteamid: comments.profileSteamid,
        parentId: comments.parentId,
        userId: comments.userId,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (!parent) throw new Error("parent_not_found");
    if (
      parent.creationId !== creationId ||
      parent.profileSteamid !== profileSteamid
    ) {
      throw new Error("parent_mismatch");
    }
    if (parent.deletedAt) throw new Error("parent_deleted");

    // Walk up to find the parent's own depth. Reply sits at parentDepth + 1,
    // so parentDepth must be < MAX_REPLY_DEPTH.
    let parentDepth = 0;
    let ancestorId: number | null = parent.parentId;
    while (ancestorId != null) {
      parentDepth += 1;
      if (parentDepth >= MAX_REPLY_DEPTH) break;
      const [next] = await db
        .select({ parentId: comments.parentId })
        .from(comments)
        .where(eq(comments.id, ancestorId))
        .limit(1);
      ancestorId = next?.parentId ?? null;
    }
    if (parentDepth >= MAX_REPLY_DEPTH) throw new Error("max_reply_depth");

    parentAuthorId = parent.userId;
  }

  const [inserted] = await db
    .insert(comments)
    .values({
      creationId,
      profileSteamid,
      userId: user.steamid,
      body,
      parentId,
    })
    .returning({ id: comments.id });

  if (parentAuthorId && parentAuthorId !== user.steamid) {
    let link: string;
    let context: string;
    if (creationId) {
      const [row] = await db
        .select({ shortId: creations.shortId, title: creations.title })
        .from(creations)
        .where(eq(creations.id, creationId))
        .limit(1);
      link = row
        ? `/creation/${row.shortId}#comment-${inserted?.id ?? ""}`
        : `/creation/${creationId}`;
      context = row ? ` on "${row.title}"` : "";
    } else {
      link = `/profile/${profileSteamid}#comment-${inserted?.id ?? ""}`;
      context = " on a profile";
    }
    await createNotification({
      userId: parentAuthorId,
      type: "comment_reply",
      tier: "user",
      title: `${user.personaName} replied to your comment`,
      body: `${body.slice(0, 140)}${context}`,
      link,
    });
  }

  // Also notify the profile owner of a new top-level wall comment. Mirrors
  // the existing mod broadcast on reports: best-effort, skip self-posts.
  if (
    profileSteamid &&
    parentId == null &&
    profileSteamid !== user.steamid
  ) {
    await createNotification({
      userId: profileSteamid,
      type: "profile_comment",
      tier: "user",
      title: `${user.personaName} left a comment on your profile`,
      body: body.slice(0, 180),
      link: `/profile/${profileSteamid}#comment-${inserted?.id ?? ""}`,
    });
  }

  if (creationId) revalidatePath(`/creation/${creationId}`);
  if (profileSteamid) revalidatePath(`/profile/${profileSteamid}`);
}

/**
 * Soft-delete (sets deletedAt + body replaced in display with [deleted]).
 * Users can delete their own; mods and above can delete anyone's.
 */
export async function deleteComment(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");

  const idRaw = String(formData.get("commentId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_comment_id");

  const db = getDb();
  const [row] = await db
    .select({
      userId: comments.userId,
      creationId: comments.creationId,
      profileSteamid: comments.profileSteamid,
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (!row) throw new Error("comment_not_found");

  const isOwner = row.userId === user.steamid;
  // effectiveRole() strips mod powers while a user is time-banned, so a
  // mid-ban moderator can't still delete comments.
  const isMod = isModerator(effectiveRole(user));
  if (!isOwner && !isMod) throw new Error("forbidden");

  await db
    .update(comments)
    .set({
      deletedAt: new Date(),
      deletedByUserId: user.steamid,
    })
    .where(eq(comments.id, id));

  if (row.creationId) revalidatePath(`/creation/${row.creationId}`);
  if (row.profileSteamid) revalidatePath(`/profile/${row.profileSteamid}`);
}

function parsePublishedFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id");
    if (id && /^\d+$/.test(id)) return id;
  } catch {
    /* not a URL */
  }
  const match = trimmed.match(/id=(\d+)/);
  return match?.[1] ?? null;
}

export type SubmitResult =
  | { ok: true; publishedFileId: string; title: string }
  | { ok: false; error: string };

/**
 * User-facing workshop submission. Goes into the pending queue with
 * uploadedByUserId set so we can show a "community added" badge. Not
 * auto-approved — every submission runs through triage.
 */
export async function submitCreation(formData: FormData): Promise<SubmitResult> {
  let user;
  try {
    user = await requireVotingUser();
  } catch (err) {
    const code = err instanceof Error ? err.message : "failed";
    return { ok: false, error: friendlyGateError(code) };
  }

  const db = getDb();

  // Rate checks run FIRST — before Steam API burn and duplicate lookup — so
  // spamming URLs (valid or duplicate) can't bypass the cooldown.
  const recentWindow = await countSubmissionsByUserSince(user.steamid, 10 * 60);
  if (recentWindow > 0) {
    return { ok: false, error: "Please wait 10 minutes between submissions." };
  }
  // Daily cap: 5 per user per 24h keeps any one account from carpet-bombing
  // the triage queue even if they pace across the 10-min cooldown.
  const dailyCount = await countSubmissionsByUserSince(user.steamid, 24 * 60 * 60);
  if (dailyCount >= 5) {
    return { ok: false, error: "Daily submission limit reached (5 per 24h)." };
  }

  const raw = String(formData.get("input") ?? "").trim();
  const id = parsePublishedFileId(raw);
  if (!id) return { ok: false, error: "Couldn't parse a URL or numeric id." };

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return { ok: false, error: "Steam API key not configured." };

  const [existing] = await db
    .select({ id: creations.id, status: creations.status })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      error: `Already in the system (status: ${existing.status}).`,
    };
  }

  const [item] = await getPublishedFileDetails([id]);
  if (!item) return { ok: false, error: "Steam returned no data for that id." };
  if (item.result != null && item.result !== 1) {
    return { ok: false, error: `Steam rejected the lookup (result=${item.result}).` };
  }
  // ISteamRemoteStorage returns `creator_app_id`; QueryFiles returns
  // `consumer_appid`. Accept either, and only reject the item if whichever
  // is present isn't in the SM appid set. If BOTH are missing (older
  // responses), fall back to a Scrap Mechanic kind tag check — better to
  // let a mis-tagged item land in triage than to reject every submission.
  const appidCandidate = item.creator_app_id ?? item.consumer_appid;
  if (appidCandidate != null && !SCRAP_MECHANIC_APPIDS.includes(appidCandidate)) {
    return { ok: false, error: "That item isn't from the Scrap Mechanic Workshop." };
  }
  if (appidCandidate == null) {
    const tagNamesLower = (item.tags ?? []).map((t) => t.tag.toLowerCase());
    const hasSmKindTag = tagNamesLower.some((t) =>
      [
        "blueprint",
        "mod",
        "world",
        "challenge pack",
        "tile",
        "custom game",
        "terrain assets",
      ].includes(t),
    );
    if (!hasSmKindTag) {
      return { ok: false, error: "That item isn't from the Scrap Mechanic Workshop." };
    }
  }

  const tagNames = (item.tags ?? []).map((t) => t.tag);
  const kind = detectKind(tagNames);
  const descRaw = item.file_description || item.short_description || "";
  const descClean = stripBBCode(descRaw);

  let authorName: string | null = null;
  if (item.creator) {
    try {
      const names = await resolvePlayerNames(apiKey, [item.creator]);
      authorName = names.get(item.creator) ?? null;
    } catch {
      /* best-effort */
    }
  }
  // Multi-creator scrape (see fetchWorkshopContributors). Best-effort.
  let creators: Array<{ steamid: string; name: string }> = [];
  try {
    creators = await fetchWorkshopContributors(apiKey, item.publishedfileid);
  } catch {
    /* best-effort — falls back to single author */
  }

  await db.insert(creations).values({
    id: item.publishedfileid,
    title: item.title || "(untitled)",
    descriptionRaw: descRaw,
    descriptionClean: descClean,
    authorSteamid: item.creator ?? null,
    authorName,
    creators,
    thumbnailUrl: item.preview_url ?? null,
    steamUrl: steamUrlFor(item.publishedfileid),
    fileSizeBytes:
      typeof item.file_size === "string"
        ? Number(item.file_size) || null
        : (item.file_size ?? null),
    timeCreated: item.time_created ? new Date(item.time_created * 1000) : null,
    timeUpdated: item.time_updated ? new Date(item.time_updated * 1000) : null,
    voteScore: item.vote_data?.score ?? null,
    votesUp: item.vote_data?.votes_up ?? null,
    votesDown: item.vote_data?.votes_down ?? null,
    subscriptions: item.lifetime_subscriptions ?? item.subscriptions ?? 0,
    favorites: item.lifetime_favorited ?? item.favorited ?? 0,
    views: item.views ?? 0,
    steamTags: tagNames,
    kind,
    status: "pending",
    uploadedByUserId: user.steamid,
  });

  // Run the keyword tagger on the new creation.
  const suggestions = classify({
    title: item.title ?? "",
    descriptionClean: descClean,
    steamTags: tagNames,
  });
  if (suggestions.length > 0) {
    const tagRows = await db
      .select({ id: tags.id, slug: tags.slug, categoryId: tags.categoryId })
      .from(tags);
    const tagBySlug = new Map(tagRows.map((t) => [t.slug, t]));
    const tagInserts: (typeof creationTags.$inferInsert)[] = [];
    const categoryIdSet = new Set<number>();
    for (const s of suggestions) {
      const tag = tagBySlug.get(s.slug);
      if (!tag) continue;
      tagInserts.push({
        creationId: item.publishedfileid,
        tagId: tag.id,
        source: s.source,
        confidence: s.confidence,
        confirmed: false,
      });
      if (tag.categoryId) categoryIdSet.add(tag.categoryId);
    }
    if (tagInserts.length > 0) {
      await db.insert(creationTags).values(tagInserts).onConflictDoNothing();
    }
    if (categoryIdSet.size > 0) {
      await db
        .insert(creationCategories)
        .values(
          Array.from(categoryIdSet).map((cid) => ({
            creationId: item.publishedfileid,
            categoryId: cid,
          })),
        )
        .onConflictDoNothing();
    }
  }

  revalidatePath("/admin/triage");
  revalidatePath("/admin/queue");

  return {
    ok: true,
    publishedFileId: item.publishedfileid,
    title: item.title || "(untitled)",
  };
}

export async function voteComment(
  commentId: number,
  value: -1 | 0 | 1,
): Promise<void> {
  const user = await requireVotingUser();
  if (!Number.isInteger(commentId) || commentId <= 0) {
    throw new Error("invalid_comment_id");
  }
  if (isInMemoryRateLimited(`voteComment:${user.steamid}`, 30, 60_000)) {
    throw new Error("rate_limited");
  }
  const db = getDb();

  const [row] = await db
    .select({
      userId: comments.userId,
      creationId: comments.creationId,
      profileSteamid: comments.profileSteamid,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!row) throw new Error("comment_not_found");
  if (row.deletedAt) throw new Error("comment_deleted");
  if (row.userId === user.steamid) throw new Error("cannot_self_vote");

  const [existing] = await db
    .select({ value: commentVotes.value })
    .from(commentVotes)
    .where(
      and(
        eq(commentVotes.userId, user.steamid),
        eq(commentVotes.commentId, commentId),
      ),
    )
    .limit(1);

  if (value === 0 && !existing) return;
  if (value !== 0 && existing && existing.value === value) return;

  if (value === 0) {
    await db
      .delete(commentVotes)
      .where(
        and(
          eq(commentVotes.userId, user.steamid),
          eq(commentVotes.commentId, commentId),
        ),
      );
  } else {
    await db
      .insert(commentVotes)
      .values({ userId: user.steamid, commentId, value })
      .onConflictDoUpdate({
        target: [commentVotes.userId, commentVotes.commentId],
        set: { value, createdAt: new Date() },
      });
  }

  const tallies = await db
    .select({ value: commentVotes.value })
    .from(commentVotes)
    .where(eq(commentVotes.commentId, commentId));
  let up = 0;
  let down = 0;
  for (const t of tallies) {
    if (t.value > 0) up += 1;
    else if (t.value < 0) down += 1;
  }
  await db
    .update(comments)
    .set({ votesUp: up, votesDown: down })
    .where(eq(comments.id, commentId));

  if (row.creationId) revalidatePath(`/creation/${row.creationId}`);
  if (row.profileSteamid) revalidatePath(`/profile/${row.profileSteamid}`);
}

export async function voteTag(
  creationId: string,
  tagId: number,
  value: -1 | 0 | 1,
): Promise<void> {
  const user = await requireVotingUser();
  // 30 tag votes / 60s / user — matches voteCreation's cap.
  if (isInMemoryRateLimited(`voteTag:${user.steamid}`, 30, 60_000)) {
    throw new Error("rate_limited");
  }
  const db = getDb();

  if (value === 0) {
    await db
      .delete(tagVotes)
      .where(
        and(
          eq(tagVotes.userId, user.steamid),
          eq(tagVotes.creationId, creationId),
          eq(tagVotes.tagId, tagId),
        ),
      );
  } else {
    await db
      .insert(tagVotes)
      .values({ userId: user.steamid, creationId, tagId, value })
      .onConflictDoUpdate({
        target: [tagVotes.userId, tagVotes.creationId, tagVotes.tagId],
        set: { value, createdAt: new Date() },
      });
  }

  revalidatePath(`/creation/${creationId}`);
}

