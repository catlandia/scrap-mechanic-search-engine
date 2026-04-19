import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { badgeAutogrants, userBadges } from "@/lib/db/schema";
import {
  AUTOGRANT_BADGES,
  BADGES,
  BETA_END_DATE,
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

// Idempotent — called at sign-in. Grants every badge currently listed in
// badge_autogrants for this steamid. Doesn't revoke when an autogrant is
// later removed: un-badging is an explicit action via /admin/users.
export async function applyAutogrants(userId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ slug: badgeAutogrants.slug })
    .from(badgeAutogrants)
    .where(eq(badgeAutogrants.steamid, userId));
  for (const r of rows) {
    if (!BADGES[r.slug]) continue;
    await grantBadge({
      userId,
      slug: r.slug,
      grantedByUserId: null,
    });
  }
}

export interface AutograntRow {
  slug: string;
  steamid: string;
  label: string | null;
  addedAt: Date;
  addedByUserId: string | null;
}

export async function listAutogrants(slug: string): Promise<AutograntRow[]> {
  const db = getDb();
  return db
    .select()
    .from(badgeAutogrants)
    .where(eq(badgeAutogrants.slug, slug))
    .orderBy(desc(badgeAutogrants.addedAt));
}

export async function addAutogrant(params: {
  slug: string;
  steamid: string;
  label: string | null;
  addedByUserId: string | null;
}): Promise<void> {
  if (!AUTOGRANT_BADGES.includes(params.slug)) {
    throw new Error("badge_not_autograntable");
  }
  if (!BADGES[params.slug]) throw new Error("unknown_badge");
  const db = getDb();
  await db
    .insert(badgeAutogrants)
    .values({
      slug: params.slug,
      steamid: params.steamid,
      label: params.label,
      addedByUserId: params.addedByUserId,
    })
    .onConflictDoUpdate({
      target: [badgeAutogrants.slug, badgeAutogrants.steamid],
      set: { label: params.label, addedByUserId: params.addedByUserId },
    });
  // Best-effort immediate grant if the user already has a row.
  try {
    await grantBadge({
      userId: params.steamid,
      slug: params.slug,
      grantedByUserId: null,
    });
  } catch {
    // User might not exist yet (FK violation on insert); sign-in will grant.
  }
}

export async function removeAutogrant(slug: string, steamid: string): Promise<void> {
  const db = getDb();
  await db
    .delete(badgeAutogrants)
    .where(
      and(eq(badgeAutogrants.slug, slug), eq(badgeAutogrants.steamid, steamid)),
    );
}
