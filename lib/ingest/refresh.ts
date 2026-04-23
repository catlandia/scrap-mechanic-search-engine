import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { stripBBCode } from "@/lib/steam/bbcode";
import {
  fetchWorkshopContributors,
  getPublishedFileDetails,
  pickFullDescription,
  type PublishedFile,
} from "@/lib/steam/client";

export interface RefreshResult {
  refreshed: number;
  contributorsFilled: number;
  errors: string[];
}

export async function runRefresh(batchSize = 100): Promise<RefreshResult> {
  const db = getDb();
  const approved = await db
    .select({ id: creations.id })
    .from(creations)
    .where(eq(creations.status, "approved"));

  const errors: string[] = [];
  let refreshed = 0;

  for (let i = 0; i < approved.length; i += batchSize) {
    const batch = approved.slice(i, i + batchSize).map((r) => r.id);
    let details: PublishedFile[] = [];
    try {
      details = await getPublishedFileDetails(batch);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }

    for (const d of details) {
      try {
        // Self-heal descriptions alongside the stats refresh. Rows ingested
        // before V8.18 stored the truncated `short_description` as the clean
        // body; the new `pickFullDescription` picks whichever field Steam
        // populated. Writing it on every refresh means the catalog heals as
        // the cron rotates through, no separate backfill needed.
        const descRaw = pickFullDescription(d);
        const descClean = stripBBCode(descRaw);
        await db
          .update(creations)
          .set({
            subscriptions: d.lifetime_subscriptions ?? d.subscriptions ?? 0,
            favorites: d.lifetime_favorited ?? d.favorited ?? 0,
            views: d.views ?? 0,
            voteScore: d.vote_data?.score ?? null,
            votesUp: d.vote_data?.votes_up ?? null,
            votesDown: d.vote_data?.votes_down ?? null,
            ...(descRaw
              ? { descriptionRaw: descRaw, descriptionClean: descClean }
              : {}),
          })
          .where(eq(creations.id, d.publishedfileid));
        refreshed += 1;
      } catch (err) {
        errors.push(
          `update ${d.publishedfileid}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  // Second pass: rotate through the catalog and re-scrape multi-creator
  // attribution. Ordered by creatorsRefreshedAt ASC NULLS FIRST so never-
  // scraped rows come first, then the oldest-refreshed. Capped to keep
  // the cron inside Vercel's function timeout. The weekly cron is the
  // *bulk* drain — 500 rows is roughly 100 seconds at a 200 ms per-row
  // throttle, comfortably inside the 300 s function ceiling. The daily
  // ingest cron ALSO calls `refreshStaleCreators` as a continuous top-up
  // pass (see `app/api/cron/ingest/route.ts`), so combined weekly
  // throughput is ~500 + (200 × 7) ≈ 1900 rows — enough to drain a
  // ~1000-item catalog every few days and keep it rescanned on rotation.
  const contributorsFilled = await refreshStaleCreators(500);

  return { refreshed, contributorsFilled, errors };
}

/**
 * Re-scrape multi-creator attribution for up to `limit` approved creations,
 * preferring rows that have never been scraped or were scraped longest ago.
 * On scrape success (including genuine solo-creator items) we update both
 * `creators` and `creatorsRefreshedAt`. On scrape failure we update NEITHER
 * — the row's `creatorsRefreshedAt` stays where it was (null for a
 * never-scraped row, so it retries first next cycle), and whatever
 * attribution was already stored is preserved instead of being clobbered
 * with `[]`. That's the fix for the "items missing from contributors'
 * profiles" bug — transient Steam hiccups used to overwrite real
 * attribution with empty arrays and lock the row out of rotation for weeks.
 */
export async function refreshStaleCreators(limit: number): Promise<number> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return 0;
  const db = getDb();
  const rows = await db
    .select({ id: creations.id })
    .from(creations)
    .where(eq(creations.status, "approved"))
    .orderBy(sql`${creations.creatorsRefreshedAt} asc nulls first`)
    .limit(limit);
  let updated = 0;
  for (const { id } of rows) {
    const result = await fetchWorkshopContributors(apiKey, id);
    if (result.ok) {
      try {
        await db
          .update(creations)
          .set({
            creators: result.contributors,
            creatorsRefreshedAt: new Date(),
          })
          .where(eq(creations.id, id));
        updated += 1;
      } catch {
        // DB write failure — drop through; try again next rotation.
      }
    }
    // On !result.ok we intentionally skip the update so prior state +
    // timestamp are preserved.
    await new Promise((r) => setTimeout(r, 200));
  }
  return updated;
}
