"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  creations,
  creationVotes,
  favorites,
  reports,
  ROLE_WEIGHT,
  tagVotes,
  users,
} from "@/lib/db/schema";

const MIN_STEAM_AGE_DAYS = 7;

async function requireVotingUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  if (user.steamCreatedAt) {
    const ageDays = (Date.now() - user.steamCreatedAt.getTime()) / 86_400_000;
    if (ageDays < MIN_STEAM_AGE_DAYS) {
      throw new Error("steam_too_new");
    }
  }
  return user;
}

function weightOf(role: string | null | undefined): number {
  if (!role) return 1;
  return (ROLE_WEIGHT as Record<string, number>)[role] ?? 1;
}

async function recomputeSiteVoteScore(creationId: string) {
  const db = getDb();
  const rows = await db
    .select({ value: creationVotes.value, role: users.role })
    .from(creationVotes)
    .innerJoin(users, eq(users.steamid, creationVotes.userId))
    .where(eq(creationVotes.creationId, creationId));

  let up = 0;
  let down = 0;
  for (const r of rows) {
    const w = weightOf(r.role);
    if (r.value > 0) up += w;
    else if (r.value < 0) down += w;
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

