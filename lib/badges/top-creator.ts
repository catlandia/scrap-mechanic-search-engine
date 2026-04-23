import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userBadges } from "@/lib/db/schema";

export const TOP_CREATOR_SLUG = "top_creator";

/**
 * Recomputes the #1 creator (by count of approved creations, counting both
 * the `authorSteamid` axis and the `creators[]` jsonb co-author axis, with
 * DISTINCT on creation id) and rewrites `user_badges` so the `top_creator`
 * slug sits on exactly zero or one row.
 *
 * Eligibility for the badge:
 *   - User must have a row in `users` (i.e. they've signed in here).
 *   - User must not be hard-banned.
 *   - User must have at least one approved creation.
 *
 * If the #1 creator doesn't satisfy all three, the badge sits unowned until
 * someone eligible reclaims the top spot. Tie-break is siteJoinedAt ASC so
 * the earliest user to the site wins when the count is equal.
 *
 * Called from every server action that can change an approved creation's
 * effective count (approve / quickApprove / archive / restoreFromArchive /
 * hardDelete / rescrapeCreators). Never throws — a failed rebalance must
 * not roll back the action that triggered it.
 */
export async function refreshTopCreatorBadge(): Promise<void> {
  try {
    const db = getDb();

    const rows = await db.execute<{ steamid: string }>(sql`
      with combined as (
        select id as creation_id, author_steamid as steamid
        from creations
        where status = 'approved' and author_steamid is not null
        union
        select c.id, (elem->>'steamid')::text
        from creations c, jsonb_array_elements(c.creators) as elem
        where c.status = 'approved'
      ),
      agg as (
        select steamid, count(distinct creation_id)::int as count
        from combined
        where steamid is not null
        group by steamid
      )
      select a.steamid
      from agg a
      inner join users u on u.steamid = a.steamid
      where u.hard_banned = false
      order by a.count desc, u.site_joined_at asc nulls last, a.steamid asc
      limit 1
    `);

    const winner: string | null = rows.rows?.[0]?.steamid ?? null;

    if (winner) {
      // Revoke the badge from anyone who isn't the current winner.
      await db
        .delete(userBadges)
        .where(
          and(
            eq(userBadges.badgeSlug, TOP_CREATOR_SLUG),
            ne(userBadges.userId, winner),
          ),
        );
      // Grant (idempotent) to the winner.
      await db
        .insert(userBadges)
        .values({
          userId: winner,
          badgeSlug: TOP_CREATOR_SLUG,
          grantedByUserId: null,
          note: "Auto-granted: most approved creations.",
        })
        .onConflictDoNothing();
    } else {
      // No eligible winner — badge sits unowned.
      await db
        .delete(userBadges)
        .where(eq(userBadges.badgeSlug, TOP_CREATOR_SLUG));
    }
  } catch (err) {
    console.error("[badges/top-creator] refresh failed:", err);
  }
}
