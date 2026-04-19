import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { fetchWorkshopContributors } from "@/lib/steam/client";

/**
 * One-time backfill: scrape multi-creator attribution from Steam for every
 * approved creation that currently has an empty `creators` array. Safe to
 * re-run — only touches rows where `creators = '[]'`.
 *
 * Gentle on Steam: processes in small batches with a 150ms delay per item.
 */
async function main() {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY missing");
  const db = getDb();

  const rows = await db
    .select({ id: creations.id, title: creations.title })
    .from(creations)
    .where(sql`${creations.status} in ('approved', 'pending') and ${creations.creators} = '[]'::jsonb`)
    .orderBy(creations.id);

  console.log(`${rows.length} creations to backfill.`);
  let updated = 0;
  let withContributors = 0;
  for (let i = 0; i < rows.length; i++) {
    const { id, title } = rows[i];
    try {
      const contributors = await fetchWorkshopContributors(apiKey, id);
      await db.update(creations).set({ creators: contributors }).where(eq(creations.id, id));
      updated++;
      if (contributors.length > 0) withContributors++;
      if (contributors.length > 1) {
        console.log(`  ${id} "${title}" → ${contributors.length} creators: ${contributors.map((c) => c.name).join(", ")}`);
      }
    } catch (e) {
      console.error(`  ${id} failed:`, e instanceof Error ? e.message : e);
    }
    if (i % 25 === 0) console.log(`  … ${i + 1}/${rows.length}`);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`\nDone. Updated ${updated}; ${withContributors} had ≥1 contributor(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
