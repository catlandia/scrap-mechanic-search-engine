"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
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

