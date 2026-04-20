"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isCreator, effectiveRole } from "@/lib/auth/roles";
import {
  featureSuggestions,
  featureSuggestionVotes,
  users,
  type UserRole,
} from "@/lib/db/schema";
import { broadcastToRole, createNotification } from "@/lib/db/notifications";
import {
  countFeatureSuggestionsByUserSince,
  isInMemoryRateLimited,
} from "@/lib/rate-limit";

const MAX_TITLE = 120;
const MAX_BODY = 2000;
const MIN_STEAM_AGE_DAYS = 7;
// Inline image cap: 500 KB of binary bytes. Base64 inflates ~33%, so the stored
// data URI reaches ~680 KB max. Sits well inside Neon's row-size limits and
// keeps per-suggestion DB cost modest (worst case 50 suggestions/day × 680 KB =
// ~34 MB/day, trivial against the 3 GB free-tier storage).
const MAX_IMAGE_BINARY_BYTES = 500 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function validateImageDataUri(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!match) return { ok: false, error: "Image must be a base64 data URI." };
  const [, mime, b64] = match;
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, error: "Image must be PNG, JPEG, WEBP, or GIF." };
  }
  // Rough binary-size estimate from the base64 length. Cheaper than decoding.
  const binaryBytes = Math.floor((b64.length * 3) / 4);
  if (binaryBytes > MAX_IMAGE_BINARY_BYTES) {
    return { ok: false, error: "Image is larger than 500 KB." };
  }
  return { ok: true, value: raw };
}

async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  const now = Date.now();
  if (user.bannedUntil && user.bannedUntil.getTime() > now) throw new Error("banned");
  if (user.mutedUntil && user.mutedUntil.getTime() > now) throw new Error("muted");
  if (!user.bypassAgeGate) {
    if (!user.steamCreatedAt) throw new Error("steam_age_unknown");
    const ageDays = (now - user.steamCreatedAt.getTime()) / 86_400_000;
    if (ageDays < MIN_STEAM_AGE_DAYS) throw new Error("steam_too_new");
  }
  return user;
}

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  if (!isCreator(effectiveRole(user) ?? undefined)) throw new Error("not_creator");
  return user;
}

export async function submitSuggestion(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireActiveUser();
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const imageRaw = String(formData.get("image") ?? "").trim();
    if (!title) return { ok: false, error: "Title required." };
    if (title.length > MAX_TITLE) return { ok: false, error: "Title too long." };
    if (body.length > MAX_BODY) return { ok: false, error: "Body too long." };
    let image: string | null = null;
    if (imageRaw) {
      const check = validateImageDataUri(imageRaw);
      if (!check.ok) return { ok: false, error: check.error };
      image = check.value;
    }

    const db = getDb();

    // Rate limit: 1 suggestion per 5 minutes per user.
    const [recent] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(featureSuggestions)
      .where(
        and(
          eq(featureSuggestions.submitterUserId, user.steamid),
          sql`${featureSuggestions.createdAt} > now() - interval '5 minutes'`,
        ),
      );
    if ((recent?.n ?? 0) > 0) {
      return { ok: false, error: "Please wait 5 minutes between suggestions." };
    }
    // 10 per user per 24h — a firm ceiling on how much noise one account can
    // put into the creator's review queue per day.
    const daily = await countFeatureSuggestionsByUserSince(
      user.steamid,
      24 * 60 * 60,
    );
    if (daily >= 10) {
      return { ok: false, error: "Daily suggestion limit reached (10 per 24h)." };
    }

    await db.insert(featureSuggestions).values({
      submitterUserId: user.steamid,
      title,
      body: body || null,
      imageDataUri: image,
    });
    // Fan the purple bell: the creator sees every new idea land in the inbox.
    await broadcastToRole({
      minRole: "creator",
      tier: "creator",
      type: "creator_new_suggestion",
      title: `New idea: "${title.slice(0, 120)}"`,
      body: body ? body.slice(0, 200) : null,
      link: "/admin/suggestions",
      excludeUserId: user.steamid,
    });
    revalidatePath("/admin/suggestions");
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "failed";
    const friendly =
      code === "steam_too_new"
        ? "Your Steam account needs to be at least 7 days old to post an idea. This cooldown prevents fresh accounts from spamming — moderators can't bypass it, just wait it out."
        : code === "steam_age_unknown"
          ? "We couldn't verify your Steam account age because your Steam profile is private. Make your profile public, or send a moderator an appeal at /verify/appeal and they'll flip the gate on your account."
          : code === "signed_out"
            ? "You need to sign in first."
            : code === "banned"
              ? "Your account is currently banned."
              : code === "muted"
                ? "Your account is currently muted."
                : code;
    return { ok: false, error: friendly };
  }
}

export async function voteSuggestion(formData: FormData) {
  const user = await requireActiveUser();
  // 30 votes / 60s / user — matches the creation/tag vote caps.
  if (isInMemoryRateLimited(`voteSuggestion:${user.steamid}`, 30, 60_000)) {
    throw new Error("rate_limited");
  }
  const idRaw = String(formData.get("suggestionId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const valueRaw = Number(formData.get("value"));
  const value: -1 | 0 | 1 =
    valueRaw === -1 ? -1 : valueRaw === 1 ? 1 : 0;

  const db = getDb();
  const [suggestion] = await db
    .select({ status: featureSuggestions.status })
    .from(featureSuggestions)
    .where(eq(featureSuggestions.id, id))
    .limit(1);
  if (
    !suggestion ||
    (suggestion.status !== "approved" && suggestion.status !== "implemented")
  ) {
    throw new Error("not_votable");
  }

  if (value === 0) {
    await db
      .delete(featureSuggestionVotes)
      .where(
        and(
          eq(featureSuggestionVotes.userId, user.steamid),
          eq(featureSuggestionVotes.suggestionId, id),
        ),
      );
  } else {
    await db
      .insert(featureSuggestionVotes)
      .values({
        userId: user.steamid,
        suggestionId: id,
        value,
      })
      .onConflictDoUpdate({
        target: [
          featureSuggestionVotes.userId,
          featureSuggestionVotes.suggestionId,
        ],
        set: { value, createdAt: new Date() },
      });
  }

  revalidatePath("/suggestions");
}

/**
 * Creator-only hard reject: deletes the suggestion row (votes cascade via
 * FK). Used when you don't even want it appearing in the Rejected tab.
 */
export async function deleteSuggestion(formData: FormData) {
  await requireCreator();
  const idRaw = String(formData.get("suggestionId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");

  const db = getDb();
  await db.delete(featureSuggestions).where(eq(featureSuggestions.id, id));

  revalidatePath("/admin/suggestions");
  revalidatePath("/suggestions");
}

export async function updateSuggestionNote(formData: FormData) {
  await requireCreator();
  const idRaw = String(formData.get("suggestionId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const note = String(formData.get("note") ?? "").trim() || null;

  const db = getDb();
  await db
    .update(featureSuggestions)
    .set({ creatorNote: note })
    .where(eq(featureSuggestions.id, id));

  revalidatePath("/admin/suggestions");
  revalidatePath("/suggestions");
}

export async function setSuggestionStatus(formData: FormData) {
  const actor = await requireCreator();
  const idRaw = String(formData.get("suggestionId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const status = String(formData.get("status") ?? "");
  if (!["submitted", "approved", "rejected", "implemented"].includes(status)) {
    throw new Error("invalid_status");
  }
  const note = String(formData.get("note") ?? "").trim() || null;

  const db = getDb();

  const [suggestion] = await db
    .select({ submitterUserId: featureSuggestions.submitterUserId, title: featureSuggestions.title })
    .from(featureSuggestions)
    .where(eq(featureSuggestions.id, id))
    .limit(1);

  await db
    .update(featureSuggestions)
    .set({
      status,
      creatorNote: note,
      approvedByUserId: status === "approved" ? actor.steamid : null,
      approvedAt: status === "approved" ? new Date() : null,
      implementedAt: status === "implemented" ? new Date() : null,
    })
    .where(eq(featureSuggestions.id, id));

  if (suggestion?.submitterUserId && status !== "submitted") {
    const notifMap: Record<string, { title: string; body: string }> = {
      approved: { title: "Idea approved!", body: `Your idea "${suggestion.title}" has been approved for voting.` },
      rejected: { title: "Idea not accepted", body: `Your idea "${suggestion.title}" was not accepted.` },
      implemented: { title: "Idea implemented!", body: `Your idea "${suggestion.title}" has been implemented.` },
    };
    const notif = notifMap[status];
    if (notif) {
      await createNotification({
        userId: suggestion.submitterUserId,
        type: `suggestion_${status}`,
        title: notif.title,
        body: notif.body,
        link: "/suggestions",
      });
    }
  }

  revalidatePath("/admin/suggestions");
  revalidatePath("/suggestions");
}

export interface SuggestionRow {
  id: number;
  title: string;
  body: string | null;
  status: string;
  createdAt: Date;
  approvedAt: Date | null;
  implementedAt: Date | null;
  creatorNote: string | null;
  imageDataUri: string | null;
  submitterSteamid: string | null;
  submitterName: string | null;
  submitterRole: string | null;
  /** Net score = sum(value). */
  voteCount: number;
  /** Raw upvote / downvote counts for display. */
  upCount: number;
  downCount: number;
  /** Current viewer's vote: -1 / 0 / 1 */
  viewerVote: -1 | 0 | 1;
}

async function getSuggestionsByStatuses(
  statuses: string[],
  viewerSteamid: string | null,
): Promise<SuggestionRow[]> {
  if (statuses.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: featureSuggestions.id,
      title: featureSuggestions.title,
      body: featureSuggestions.body,
      status: featureSuggestions.status,
      createdAt: featureSuggestions.createdAt,
      approvedAt: featureSuggestions.approvedAt,
      implementedAt: featureSuggestions.implementedAt,
      creatorNote: featureSuggestions.creatorNote,
      imageDataUri: featureSuggestions.imageDataUri,
      submitterSteamid: featureSuggestions.submitterUserId,
      submitterName: users.personaName,
      submitterRole: users.role,
      voteCount: sql<number>`coalesce((SELECT sum(value)::int FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id}), 0)`,
      upCount: sql<number>`coalesce((SELECT count(*)::int FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id} AND v.value = 1), 0)`,
      downCount: sql<number>`coalesce((SELECT count(*)::int FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id} AND v.value = -1), 0)`,
      viewerVote: viewerSteamid
        ? sql<number>`coalesce((SELECT value FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id} AND v.user_id = ${viewerSteamid}), 0)`
        : sql<number>`0`,
    })
    .from(featureSuggestions)
    .leftJoin(users, eq(users.steamid, featureSuggestions.submitterUserId))
    .where(inArray(featureSuggestions.status, statuses))
    .orderBy(
      sql`coalesce((SELECT sum(value)::int FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id}), 0) DESC`,
      desc(featureSuggestions.approvedAt),
      desc(featureSuggestions.createdAt),
    );
  return rows.map((r) => ({
    ...r,
    viewerVote: r.viewerVote === -1 ? -1 : r.viewerVote === 1 ? 1 : 0,
  }));
}

export async function getApprovedSuggestions(
  viewerSteamid: string | null,
): Promise<SuggestionRow[]> {
  return getSuggestionsByStatuses(["approved"], viewerSteamid);
}

export async function getImplementedSuggestions(
  viewerSteamid: string | null,
): Promise<SuggestionRow[]> {
  return getSuggestionsByStatuses(["implemented"], viewerSteamid);
}

export async function getRejectedSuggestions(
  viewerSteamid: string | null,
): Promise<SuggestionRow[]> {
  return getSuggestionsByStatuses(["rejected"], viewerSteamid);
}

export async function getPendingSuggestions(): Promise<SuggestionRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: featureSuggestions.id,
      title: featureSuggestions.title,
      body: featureSuggestions.body,
      status: featureSuggestions.status,
      createdAt: featureSuggestions.createdAt,
      approvedAt: featureSuggestions.approvedAt,
      implementedAt: featureSuggestions.implementedAt,
      creatorNote: featureSuggestions.creatorNote,
      imageDataUri: featureSuggestions.imageDataUri,
      submitterSteamid: featureSuggestions.submitterUserId,
      submitterName: users.personaName,
      submitterRole: users.role,
    })
    .from(featureSuggestions)
    .leftJoin(users, eq(users.steamid, featureSuggestions.submitterUserId))
    .where(eq(featureSuggestions.status, "submitted"))
    .orderBy(desc(featureSuggestions.createdAt));
  return rows.map((r) => ({
    ...r,
    voteCount: 0,
    upCount: 0,
    downCount: 0,
    viewerVote: 0 as const,
  }));
}
