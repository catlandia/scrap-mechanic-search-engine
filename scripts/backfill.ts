/**
 * One-off repopulation after the 2026-08-22 move off Neon.
 *
 * The Neon compute quota blew on 2026-08-19 and locked the database until the
 * monthly reset, so the site moved to a fresh Postgres with an empty schema.
 * This walks the Workshop deeper than the daily cron does to rebuild the
 * catalogue. Ingest still applies the per-kind follow-count and age gates in
 * lib/ingest/thresholds.ts, so low-effort items never make it in.
 *
 * Usage: npx tsx scripts/backfill.ts [pagesPerKind]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { runIngest } from "@/lib/ingest/pipeline";

async function main() {
  const pages = Number(process.argv[2] ?? 10);
  console.log(`Backfilling: up to ${pages} pages per kind, no early stop…`);
  const started = Date.now();

  const result = await runIngest({
    pagesPerKind: pages,
    numPerPage: 50,
    minNewPerKind: 0, // scan to the ceiling; we want depth, not novelty
  });

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\nFinished in ${secs}s`);
  console.log(JSON.stringify(result, null, 2).slice(0, 2000));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
