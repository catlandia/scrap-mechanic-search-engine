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
 * scraping time and a small update per row.
 *
 * Flags:
 *   --only-empty        Only touch rows whose creators array is currently
 *                       `[]` (cheap catch-up mode).
 *   --skip-fresh=HOURS  Skip rows whose `creators_refreshed_at` is newer
 *                       than HOURS ago. Lets you interrupt + resume a
 *                       long run without redoing successful work.
 *                       Default: 0 (no skipping).
 *   --throttle=MS       Milliseconds to pause between rows. Steam rate-
 *                       limits the HTML endpoint hard — keep this at
 *                       2500+ for a catalog-wide run. Default: 2500.
 *
 * The scraper itself already honours 429s with a 30–60 s cooldown, so a
 * temporary penalty-box only slows the script, it doesn't kill it.
 */
async function main() {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY missing");
  const db = getDb();

  const onlyEmpty = process.argv.includes("--only-empty");
  const skipFreshHours = Number(
    process.argv.find((a) => a.startsWith("--skip-fresh="))?.split("=")[1] ?? 0,
  );
  const throttleMs = Number(
    process.argv.find((a) => a.startsWith("--throttle="))?.split("=")[1] ?? 2500,
  );

  const conditions = [sql`${creations.status} in ('approved', 'pending')`];
  if (onlyEmpty) {
    conditions.push(sql`jsonb_array_length(${creations.creators}) = 0`);
  }
  if (skipFreshHours > 0) {
    conditions.push(
      sql`(${creations.creatorsRefreshedAt} is null or ${creations.creatorsRefreshedAt} < now() - (${skipFreshHours} || ' hours')::interval)`,
    );
  }
  const whereClause = conditions.reduce(
    (acc, c) => sql`${acc} and ${c}`,
    sql`1=1`,
  );

  const rows = await db
    .select({ id: creations.id, title: creations.title })
    .from(creations)
    .where(whereClause)
    .orderBy(creations.id);

  console.log(
    `${rows.length} creations to ${onlyEmpty ? "catch up (empty only)" : "refresh"} at ${throttleMs}ms throttle${skipFreshHours ? ` (skipping rows fresher than ${skipFreshHours}h)` : ""}.`,
  );

  let updated = 0;
  let withContributors = 0;
  let multi = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const { id, title } = rows[i];
    try {
      const result = await fetchWorkshopContributors(apiKey, id);
      if (!result.ok) {
        failed++;
        console.log(`  ${id} "${title}" — scrape failed (${result.reason}); skipping`);
      } else {
        const contributors = result.contributors;
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
      }
    } catch (e) {
      failed++;
      console.error(`  ${id} failed:`, e instanceof Error ? e.message : e);
    }
    if (i % 50 === 0) console.log(`  … ${i + 1}/${rows.length} · ${updated} updated · ${failed} failed`);
    await new Promise((r) => setTimeout(r, throttleMs));
  }

  console.log(
    `\nDone. Updated ${updated}; ${withContributors} with ≥1 contributor; ${multi} multi-creator; ${failed} failed.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
