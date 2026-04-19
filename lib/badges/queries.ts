import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userBadges } from "@/lib/db/schema";
import {
  BADGES,
  BETA_END_DATE,
  INFLUENCER_STEAMIDS,
  type BadgeDef,
} from "./definitions";

export interface GrantedBadge {
  def: BadgeDef;
  grantedAt: Date;
  grantedByUserId: string | null;
  note: string | null;
}

export async function getUserBadges(steamid: string): Promise<GrantedBadge[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.userId, steamid))
    .orderBy(desc(userBadges.grantedAt));
  return rows
    .map((r) => {
      const def = BADGES[r.badgeSlug];
      if (!def) return null;
      return {
        def,
        grantedAt: r.grantedAt,
        grantedByUserId: r.grantedByUserId,
        note: r.note,
      };
    })
    .filter((x): x is GrantedBadge => x !== null);
}

// Bulk-lookup — for any list of steamids, return a map steamid → badge defs.
// Used by /creators so one query covers the whole page.
export async function getBadgesForSteamIds(
  steamids: string[],
): Promise<Map<string, BadgeDef[]>> {
  const out = new Map<string, BadgeDef[]>();
  if (steamids.length === 0) return out;
  const db = getDb();
  const rows = await db
    .select({ userId: userBadges.userId, slug: userBadges.badgeSlug })
    .from(userBadges)
    .where(inArray(userBadges.userId, steamids));
  for (const r of rows) {
    const def = BADGES[r.slug];
    if (!def) continue;
    const list = out.get(r.userId) ?? [];
    list.push(def);
    out.set(r.userId, list);
  }
  return out;
}

export async function grantBadge(params: {
  userId: string;
  slug: string;
  grantedByUserId: string | null;
  note?: string | null;
}): Promise<void> {
  const def = BADGES[params.slug];
  if (!def) throw new Error("unknown_badge");
  const db = getDb();
  await db
    .insert(userBadges)
    .values({
      userId: params.userId,
      badgeSlug: params.slug,
      grantedByUserId: params.grantedByUserId,
      note: params.note ?? null,
    })
    .onConflictDoNothing();
}

export async function revokeBadge(userId: string, slug: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userBadges)
    .where(
      and(eq(userBadges.userId, userId), eq(userBadges.badgeSlug, slug)),
    );
}

// Idempotent — called at sign-in. Grants betatester when the user joined
// before BETA_END_DATE. No-op once the window closes or the grant exists.
export async function maybeAutoGrantBetatester(
  userId: string,
  siteJoinedAt: Date,
): Promise<void> {
  if (siteJoinedAt >= BETA_END_DATE) return;
  await grantBadge({
    userId,
    slug: "betatester",
    grantedByUserId: null,
  });
}

// Idempotent — called at sign-in. Grants influencer to anyone whose
// steamid is on the curated list. No-op otherwise. Doesn't revoke an
// existing grant if the steamid is later removed from the list (so a
// manual revoke is required to actively un-badge someone).
export async function maybeAutoGrantInfluencer(userId: string): Promise<void> {
  if (!INFLUENCER_STEAMIDS.includes(userId)) return;
  await grantBadge({
    userId,
    slug: "influencer",
    grantedByUserId: null,
  });
}
