/**
 * One-off maintenance script: re-assigns creations.short_id so that
 *   - approved creations are numbered by approved_at ASC (#1 = oldest approved)
 *   - pending/rejected creations come after, ordered by ingested_at
 *   - ties broken by the Steam publishedfileid (deterministic)
 *
 * Resets the sequence afterwards so future inserts continue from max+1.
 * Idempotent — safe to run again at any time.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle(neon(url));

  // Postgres checks the UNIQUE constraint per row inside UPDATE, so we can't
  // reassign overlapping ranges in one shot. Two-phase: negate every row (still
  // unique because originals are unique), then assign the final ordering.
  console.log("Phase 1: negating short_id…");
  await db.execute(sql`UPDATE creations SET short_id = -short_id WHERE short_id > 0`);

  console.log("Phase 2: assigning ordered short_id…");
  await db.execute(sql`
    WITH ordered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY
            approved_at ASC NULLS LAST,
            ingested_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM creations
    )
    UPDATE creations AS c
    SET short_id = o.rn
    FROM ordered o
    WHERE c.id = o.id
  `);

  console.log("Resetting the sequence…");
  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('creations', 'short_id'),
      GREATEST((SELECT COALESCE(MAX(short_id), 0) FROM creations), 1)
    )
  `);

  const result = await db.execute<{
    total: number;
    min_short: number;
    max_short: number;
  }>(sql`
    SELECT
      COUNT(*)::int        AS total,
      MIN(short_id)::int   AS min_short,
      MAX(short_id)::int   AS max_short
    FROM creations
  `);
  console.log("Summary:", result.rows?.[0] ?? result[0] ?? result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
