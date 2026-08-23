/**
 * Reserves ID space on Supabase so the 2026-09-01 Neon restore cannot lose rows.
 *
 * Context: the catalogue was rebuilt from Steam on 2026-08-23 while Neon sat
 * behind an exhausted compute quota (resets 2026-09-01T00:00:00Z). Every
 * user-generated table on Supabase is currently empty, but the site is live, so
 * between now and the reset real users will create comments, reports,
 * suggestions and so on.
 *
 * Those new rows take serial ids starting at 1 — exactly the ids Neon's historic
 * rows already occupy. A restore would then hit the primary key and silently
 * skip the Neon row, losing real user history.
 *
 * This moves the live site's id space far above Neon's so the two can never
 * collide, letting the restore insert every Neon row under its original id
 * (which keeps foreign keys intact without any remapping).
 *
 * Idempotent: re-running only ever raises a sequence, never lowers one.
 *
 * Usage: npx tsx scripts/prepare-neon-restore.ts [--apply]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import postgres from "postgres";

/** Neon ids are far below this; anything at/above it was created post-migration. */
const ID_FLOOR = 10_000_000;

/**
 * Tables whose primary key is a plain serial integer. A collision here means a
 * dropped row, so each one gets its sequence pushed above ID_FLOOR.
 *
 * Deliberately excluded:
 *   - creations.short_id / users.short_id — user-visible URL numbers. Pushing
 *     these to 10,000,001 would put absurd ids in live URLs for a week. The
 *     restore reassigns them instead, preferring Neon's original values so old
 *     bookmarked /creation/<n> links keep resolving.
 *   - categories / tags — reconciled by slug at restore time, not by id.
 */
const SERIAL_PK_TABLES = [
  "comments",
  "reports",
  "notifications",
  "feature_suggestions",
  "game_reviews",
  "mod_actions",
  "changelog_entries",
  "deploy_announcements",
  "ingest_runs",
] as const;

/**
 * Rows already sitting on low ids that Neon also uses. Both tables are safe to
 * renumber right now: changelog_reads (the only child of changelog_entries) is
 * empty, and ingest_runs has no children at all.
 */
const RELOCATE = ["changelog_entries", "ingest_runs"] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    prepare: false,
    ssl: "require",
  });

  console.log(apply ? "APPLYING changes\n" : "DRY RUN — pass --apply to commit\n");

  for (const table of RELOCATE) {
    const low = await sql.unsafe(
      `select id from "${table}" where id < ${ID_FLOOR} order by id`,
    );
    if (low.length === 0) {
      console.log(`  ${table}: no low ids to relocate`);
      continue;
    }
    console.log(
      `  ${table}: relocating ${low.length} row(s) off ids [${low.map((r) => r.id).join(", ")}]`,
    );
    if (apply) {
      // Single statement so the rows never transiently collide with each other.
      await sql.unsafe(
        `update "${table}" set id = id + ${ID_FLOOR} where id < ${ID_FLOOR}`,
      );
    }
  }

  console.log("");
  for (const table of [...SERIAL_PK_TABLES]) {
    const seqRow = await sql.unsafe(
      `select pg_get_serial_sequence('public.${table}', 'id') as seq`,
    );
    const seq = seqRow[0]?.seq;
    if (!seq) {
      console.log(`  ${table}: no sequence found — skipped`);
      continue;
    }
    const cur = await sql.unsafe(`select last_value from ${seq}`);
    const last = Number(cur[0].last_value);
    if (last >= ID_FLOOR) {
      console.log(`  ${table}: already reserved (last_value=${last})`);
      continue;
    }
    console.log(`  ${table}: ${last} -> ${ID_FLOOR}`);
    if (apply) await sql.unsafe(`select setval('${seq}', ${ID_FLOOR}, true)`);
  }

  await sql.end();
  console.log(apply ? "\nDone." : "\nDry run complete — nothing was changed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
