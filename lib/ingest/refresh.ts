import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { getPublishedFileDetails, type PublishedFile } from "@/lib/steam/client";

export interface RefreshResult {
  refreshed: number;
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

  return { refreshed, errors };
}
