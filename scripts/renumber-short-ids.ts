/**
 * Optional maintenance script: re-packs `creations.short_id` into a dense
 * 1..N range ordered by `approved_at ASC`, with deterministic tie-breaks.
 *
 * Post-V8.12 this is rarely needed — short_id is only assigned on
 * approval, so visible IDs already track the approved catalog size. The
 * only way gaps open up is if an approved creation later gets archived
 * or deleted (both preserve their short_id so URLs stay stable). Run
 * this script only if the gap ever gets large enough to feel weird.
 *
 * Invariants preserved:
 *   - Rows with short_id IS NULL (pending / rejected) stay NULL.
 *   - Approved / archived / deleted rows get packed into 1..N.
 *   - Sequence is re-anchored to the new MAX afterwards.
 *
 * Side-effect: old bookmarked URLs like /creation/500 may now point at a
 * different item. The Steam publishedfileid fallback in getCreationDetail
 * keeps deep links from the ingest side intact.
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
  // reassign overlapping ranges in one shot. Two-phase: negate every assigned
  // row (still unique), then assign the final ordering. NULL rows are never
  // touched.
  console.log("Phase 1: negating short_id on assigned rows…");
  await db.execute(sql`UPDATE creations SET short_id = -short_id WHERE short_id > 0`);

  console.log("Phase 2: packing assigned rows 1..N by approved_at…");
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
      WHERE short_id IS NOT NULL
    )
    UPDATE creations AS c
    SET short_id = o.rn
    FROM ordered o
    WHERE c.id = o.id
  `);

  console.log("Resetting the sequence to MAX(short_id)…");
  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('creations', 'short_id'),
      GREATEST((SELECT COALESCE(MAX(short_id), 0) FROM creations), 1)
    )
  `);

  const result = await db.execute<{
    total: number;
    with_id: number;
    null_id: number;
    max_short: number;
  }>(sql`
    SELECT
      COUNT(*)::int                                      AS total,
      COUNT(*) FILTER (WHERE short_id IS NOT NULL)::int  AS with_id,
      COUNT(*) FILTER (WHERE short_id IS NULL)::int      AS null_id,
      COALESCE(MAX(short_id), 0)::int                    AS max_short
    FROM creations
  `);
  console.log("Summary:", result.rows?.[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
