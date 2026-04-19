import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { fetchWorkshopContributors } from "@/lib/steam/client";

/**
 * Force a fresh multi-creator scrape for every approved / pending creation.
 * Overwrites whatever is currently in `creators` and stamps
 * `creators_refreshed_at`. Safe to re-run — idempotent, just costs Steam
 * scraping time and a small update per row. Pass `--only-empty` to only
 * touch rows whose creators array is currently `[]` (cheap catch-up mode).
 */
async function main() {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY missing");
  const db = getDb();

  const onlyEmpty = process.argv.includes("--only-empty");
  const whereClause = onlyEmpty
    ? sql`${creations.status} in ('approved', 'pending') and jsonb_array_length(${creations.creators}) = 0`
    : sql`${creations.status} in ('approved', 'pending')`;

  const rows = await db
    .select({ id: creations.id, title: creations.title })
    .from(creations)
    .where(whereClause)
    .orderBy(creations.id);

  console.log(
    `${rows.length} creations to ${onlyEmpty ? "catch up (empty only)" : "refresh (force-all)"}.`,
  );

  let updated = 0;
  let withContributors = 0;
  let multi = 0;
  for (let i = 0; i < rows.length; i++) {
    const { id, title } = rows[i];
    try {
      const contributors = await fetchWorkshopContributors(apiKey, id);
      await db
        .update(creations)
        .set({
          creators: contributors,
          creatorsRefreshedAt: new Date(),
        })
        .where(eq(creations.id, id));
      updated++;
      if (contributors.length > 0) withContributors++;
      if (contributors.length > 1) {
        multi++;
        console.log(
          `  ${id} "${title}" → ${contributors.length} creators: ${contributors.map((c) => c.name).join(", ")}`,
        );
      }
    } catch (e) {
      console.error(`  ${id} failed:`, e instanceof Error ? e.message : e);
    }
    if (i % 25 === 0) console.log(`  … ${i + 1}/${rows.length}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\nDone. Updated ${updated}; ${withContributors} with ≥1 contributor; ${multi} multi-creator.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
