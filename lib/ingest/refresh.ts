import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import {
  fetchWorkshopContributors,
  getPublishedFileDetails,
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
        await db
          .update(creations)
          .set({
            subscriptions: d.lifetime_subscriptions ?? d.subscriptions ?? 0,
            favorites: d.lifetime_favorited ?? d.favorited ?? 0,
            views: d.views ?? 0,
            voteScore: d.vote_data?.score ?? null,
            votesUp: d.vote_data?.votes_up ?? null,
            votesDown: d.vote_data?.votes_down ?? null,
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

  // Second pass: backfill multi-creator attribution for items whose scrape
  // failed previously (creators column is an empty array). Capped so the
  // weekly cron stays inside Vercel's serverless function timeout. Over
  // several runs the whole catalog catches up.
  const contributorsFilled = await refreshMissingCreators(50);

  return { refreshed, contributorsFilled, errors };
}

/**
 * Scrape multi-creator attribution for up to `limit` approved creations that
 * currently have an empty `creators` array. Runs sequentially with a small
 * delay so steamcommunity.com isn't hammered.
 */
export async function refreshMissingCreators(limit: number): Promise<number> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return 0;
  const db = getDb();
  const rows = await db
    .select({ id: creations.id })
    .from(creations)
    .where(
      sql`${creations.status} = 'approved' and jsonb_array_length(${creations.creators}) = 0`,
    )
    .limit(limit);
  let updated = 0;
  for (const { id } of rows) {
    try {
      const contributors = await fetchWorkshopContributors(apiKey, id);
      if (contributors.length > 0) {
        await db
          .update(creations)
          .set({ creators: contributors })
          .where(eq(creations.id, id));
        updated += 1;
      }
    } catch {
      // best-effort; next refresh run will retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return updated;
}
