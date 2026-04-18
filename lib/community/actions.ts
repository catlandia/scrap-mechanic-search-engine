"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import {
  categories,
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
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import {
  detectKind,
  getPublishedFileDetails,
  resolvePlayerNames,
  steamUrlFor,
  SCRAP_MECHANIC_APPID,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";
import { classify } from "@/lib/tagger/classify";

const MIN_STEAM_AGE_DAYS = 7;

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
  if (user.steamCreatedAt) {
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
  const db = getDb();

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

  const customText = String(formData.get("customText") ?? "").trim();
  if (reason === "other" && !customText) {
    throw new Error("custom_text_required");
  }

  await db.insert(reports).values({
    creationId,
    reporterUserId: user.steamid,
    reason,
    customText: customText || null,
    source: "user",
    status: "open",
  });

  revalidatePath(`/creation/${creationId}`);
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

export async function postComment(formData: FormData): Promise<void> {
  const user = await requireVotingUser();
  const creationId = String(formData.get("creationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!creationId) throw new Error("creationId required");
  if (!body) throw new Error("body_empty");
  if (body.length > MAX_COMMENT_LENGTH) throw new Error("body_too_long");

  const db = getDb();

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

  await db.insert(comments).values({
    creationId,
    userId: user.steamid,
    body,
  });

  revalidatePath(`/creation/${creationId}`);
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
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (!row) throw new Error("comment_not_found");

  const isOwner = row.userId === user.steamid;
  const isMod = isModerator(user.role as UserRole);
  if (!isOwner && !isMod) throw new Error("forbidden");

  await db
    .update(comments)
    .set({
      deletedAt: new Date(),
      deletedByUserId: user.steamid,
    })
    .where(eq(comments.id, id));

  revalidatePath(`/creation/${row.creationId}`);
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
    return { ok: false, error: code };
  }

  const raw = String(formData.get("input") ?? "").trim();
  const id = parsePublishedFileId(raw);
  if (!id) return { ok: false, error: "Couldn't parse a URL or numeric id." };

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return { ok: false, error: "Steam API key not configured." };

  const db = getDb();

  // Rate limit: one submission per 10 minutes per user.
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(creations)
    .where(
      and(
        eq(creations.uploadedByUserId, user.steamid),
        sql`${creations.ingestedAt} > now() - interval '10 minutes'`,
      ),
    );
  if ((recent?.n ?? 0) > 0) {
    return { ok: false, error: "Please wait 10 minutes between submissions." };
  }

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
  if (item.consumer_appid !== SCRAP_MECHANIC_APPID) {
    return { ok: false, error: "That item isn't from the Scrap Mechanic Workshop." };
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

  await db.insert(creations).values({
    id: item.publishedfileid,
    title: item.title || "(untitled)",
    descriptionRaw: descRaw,
    descriptionClean: descClean,
    authorSteamid: item.creator ?? null,
    authorName,
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

export async function voteTag(
  creationId: string,
  tagId: number,
  value: -1 | 0 | 1,
): Promise<void> {
  const user = await requireVotingUser();
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

