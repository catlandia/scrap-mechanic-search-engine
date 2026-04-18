"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isCreator } from "@/lib/auth/roles";
import {
  featureSuggestions,
  featureSuggestionVotes,
  users,
  type UserRole,
} from "@/lib/db/schema";

const MAX_TITLE = 120;
const MAX_BODY = 2000;
const MIN_STEAM_AGE_DAYS = 7;

async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  const now = Date.now();
  if (user.bannedUntil && user.bannedUntil.getTime() > now) throw new Error("banned");
  if (user.mutedUntil && user.mutedUntil.getTime() > now) throw new Error("muted");
  if (user.steamCreatedAt) {
    const ageDays = (now - user.steamCreatedAt.getTime()) / 86_400_000;
    if (ageDays < MIN_STEAM_AGE_DAYS) throw new Error("steam_too_new");
  }
  return user;
}

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  if (!isCreator(user.role as UserRole)) throw new Error("not_creator");
  return user;
}

export async function submitSuggestion(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireActiveUser();
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!title) return { ok: false, error: "Title required." };
    if (title.length > MAX_TITLE) return { ok: false, error: "Title too long." };
    if (body.length > MAX_BODY) return { ok: false, error: "Body too long." };

    const db = getDb();
    await db.insert(featureSuggestions).values({
      submitterUserId: user.steamid,
      title,
      body: body || null,
    });
    revalidatePath("/admin/suggestions");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "failed" };
  }
}

export async function voteSuggestion(formData: FormData) {
  const user = await requireActiveUser();
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

export async function getApprovedSuggestions(
  viewerSteamid: string | null,
): Promise<SuggestionRow[]> {
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
    .where(sql`${featureSuggestions.status} IN ('approved', 'implemented')`)
    .orderBy(
      sql`coalesce((SELECT sum(value)::int FROM feature_suggestion_votes v WHERE v.suggestion_id = ${featureSuggestions.id}), 0) DESC`,
      desc(featureSuggestions.approvedAt),
    );
  return rows.map((r) => ({
    ...r,
    viewerVote:
      r.viewerVote === -1 ? -1 : r.viewerVote === 1 ? 1 : 0,
  }));
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
