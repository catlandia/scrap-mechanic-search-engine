/**
 * Restores the pre-2026-08-19 catalogue and community history from Neon into
 * the live Supabase database.
 *
 * Background: Neon's free compute quota was exhausted on 2026-08-19 and the
 * database became unreadable, so the site moved to Supabase on 2026-08-22 and
 * the catalogue was rebuilt from the Steam Workshop. That rebuild recovered the
 * *items* but none of the human history — accounts, comments, votes, favourites,
 * moderation decisions, badges. All of that is still sitting in Neon, readable
 * again once the quota resets at 2026-09-01T00:00:00Z.
 *
 * This merges Neon into Supabase. It never deletes and never overwrites
 * anything created after the migration, so it is safe to run against the live
 * site and safe to run more than once.
 *
 * ── How conflicts are resolved ─────────────────────────────────────────────
 * • Ordinary tables: Neon rows are inserted under their original primary keys,
 *   ON CONFLICT DO NOTHING. scripts/prepare-neon-restore.ts already pushed the
 *   live site's serial ids above ID_FLOOR, so a conflict here can only mean the
 *   row was already restored by an earlier run — never a genuine clash with
 *   post-migration data.
 *
 * • categories / tags: reconciled by `slug`, not by id. The two databases were
 *   seeded independently, so id 5 does not necessarily mean the same tag in
 *   both. Every child reference (creation_tags.tag_id, tag_votes.tag_id,
 *   creation_categories.category_id, tags.category_id) is rewritten through a
 *   slug-derived map. Getting this wrong would silently mislabel the catalogue.
 *
 * • creations: matched on the Steam publishedfileid, which is stable across
 *   both databases. Neon wins for the human curation fields (status, approvals,
 *   reviewer) because those decisions cannot be reconstructed. Steam metrics are
 *   left alone — Supabase's copy is a week fresher, and the refresh cron will
 *   update them anyway.
 *
 * • creations.short_id: user-visible in /creation/<n> URLs. Neon's values are
 *   the ones people bookmarked, so they are restored verbatim. The column is
 *   UNIQUE, so the space is cleared first, then Neon's values are applied, then
 *   any Supabase-only creation is given a fresh id above Neon's maximum.
 *
 * Usage:
 *   npx tsx scripts/restore-from-neon.ts              # dry run, changes nothing
 *   npx tsx scripts/restore-from-neon.ts --apply
 *   npx tsx scripts/restore-from-neon.ts --apply --only=users,comments
 *
 * Source connection: NEON_DATABASE_URL, or the old URL kept in .env.local.bak.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import fs from "node:fs";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "")
  .replace("--only=", "")
  .split(",")
  .filter(Boolean);

/**
 * Set in site_flags once the restore has succeeded.
 *
 * This exists to protect Neon, not Supabase. The scheduled job retries daily
 * until the quota reset lets it through, and a full read of every table is
 * exactly the kind of sustained compute that exhausted the free quota in the
 * first place. Once the data is across there is no reason to ever touch Neon
 * again, so the marker makes every later run a no-op.
 */
const RESTORE_FLAG = "neon_restore_completed";

/** Matches the floor reserved by scripts/prepare-neon-restore.ts. */
const ID_FLOOR = 10_000_000;

/** Postgres allows 65,535 bind parameters per statement; stay well under. */
const PARAM_BUDGET = 60_000;

/**
 * Parents before children. Anything not listed is skipped, so a new table has
 * to be added here deliberately rather than being copied by accident.
 *
 * `deploy_announcements` is deliberately absent: the rows are throwaway
 * countdown banners for a deploy that finished weeks ago, and replaying them
 * would show live visitors a banner for an event that already happened.
 */
const TABLE_ORDER = [
  "users",
  "ingest_runs",
  "categories",
  "tags",
  "creations",
  "comments",
  "feature_suggestions",
  "changelog_entries",
  "game_reviews",
  "mod_actions",
  "notifications",
  "badge_autogrants",
  "user_badges",
  "blockdle_daily_results",
  "changelog_reads",
  "creation_views",
  "creation_votes",
  "favorites",
  "creation_categories",
  "creation_tags",
  "tag_votes",
  "comment_votes",
  "reports",
  "feature_suggestion_votes",
  "site_flags",
] as const;

/** Columns rewritten through the slug-derived id maps. */
const REMAP: Record<string, Array<{ column: string; via: "tags" | "categories" }>> = {
  tags: [{ column: "category_id", via: "categories" }],
  creation_tags: [{ column: "tag_id", via: "tags" }],
  tag_votes: [{ column: "tag_id", via: "tags" }],
  creation_categories: [{ column: "category_id", via: "categories" }],
};

/** Neon is authoritative for these; everything else on an existing row is kept. */
const CREATION_CURATION_COLUMNS = [
  "status",
  "approved_at",
  "reviewed_at",
  "reviewed_by_user_id",
  "rejected_reason",
  "is_featured",
  "uploaded_by_user_id",
  "notes",
];

type Col = { name: string; udt: string; generated: boolean };

function neonUrl(): string {
  if (process.env.NEON_DATABASE_URL) return process.env.NEON_DATABASE_URL;
  for (const f of [".env.local.bak", ".env.neon"]) {
    if (!fs.existsSync(f)) continue;
    const m = fs
      .readFileSync(f, "utf8")
      .match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m && m[1] && m[1].includes("neon.tech")) return m[1];
  }
  throw new Error(
    "No Neon connection string. Set NEON_DATABASE_URL, or keep the old URL in .env.local.bak.",
  );
}

async function columnsOf(sql: postgres.Sql, table: string): Promise<Col[]> {
  const rows = await sql`
    select column_name, udt_name, is_generated
    from information_schema.columns
    where table_schema='public' and table_name=${table}
    order by ordinal_position`;
  return rows.map((r) => ({
    name: String(r.column_name),
    udt: String(r.udt_name),
    generated: r.is_generated === "ALWAYS",
  }));
}

/** jsonb needs an explicit cast or postgres.js sends a JS object as a record. */
function placeholder(col: Col, i: number): string {
  if (col.udt === "jsonb" || col.udt === "json") return `$${i}::${col.udt}`;
  return `$${i}`;
}

function bind(col: Col, value: unknown): unknown {
  if (
    (col.udt === "jsonb" || col.udt === "json") &&
    value !== null &&
    value !== undefined
  ) {
    return JSON.stringify(value);
  }
  return value === undefined ? null : value;
}

async function insertRows(
  target: postgres.Sql,
  table: string,
  cols: Col[],
  rows: Record<string, unknown>[],
  conflict: string,
): Promise<number> {
  if (rows.length === 0 || cols.length === 0) return 0;
  const perStatement = Math.max(1, Math.floor(PARAM_BUDGET / cols.length));
  const quoted = cols.map((c) => `"${c.name}"`).join(", ");
  let written = 0;

  for (let start = 0; start < rows.length; start += perStatement) {
    const batch = rows.slice(start, start + perStatement);
    const params: unknown[] = [];
    const tuples = batch.map((row) => {
      const parts = cols.map((c) => {
        params.push(bind(c, row[c.name]));
        return placeholder(c, params.length);
      });
      return `(${parts.join(", ")})`;
    });
    const text = `insert into "${table}" (${quoted}) values ${tuples.join(", ")} ${conflict}`;
    if (APPLY) {
      const res = await target.unsafe(text, params as never[]);
      written += res.count ?? 0;
    } else {
      written += batch.length;
    }
  }
  return written;
}

/** Build neonId -> targetId keyed on slug, inserting Neon-only rows first. */
async function buildSlugMap(
  source: postgres.Sql,
  target: postgres.Sql,
  table: "tags" | "categories",
  categoryMap?: Map<number, number>,
): Promise<Map<number, number>> {
  const targetCols = (await columnsOf(target, table)).filter((c) => !c.generated);
  const srcRows = (await source.unsafe(
    `select * from "${table}"`,
  )) as unknown as Record<string, unknown>[];
  const tgtRows = await target.unsafe(`select id, slug from "${table}"`);

  const bySlug = new Map<string, number>();
  for (const r of tgtRows) bySlug.set(String(r.slug), Number(r.id));

  const map = new Map<number, number>();
  const missing: Record<string, unknown>[] = [];
  for (const r of srcRows) {
    const hit = bySlug.get(String(r.slug));
    if (hit !== undefined) map.set(Number(r.id), hit);
    else missing.push(r);
  }

  if (missing.length > 0) {
    // Let the target assign ids so a Neon-only tag cannot land on an id the
    // live site already handed out. Insert without the pk, then read back.
    const insertCols = targetCols.filter((c) => c.name !== "id");
    const prepared = missing.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      if (categoryMap && copy.category_id != null) {
        copy.category_id = categoryMap.get(Number(copy.category_id)) ?? null;
      }
      return copy;
    });
    console.log(`    + ${missing.length} ${table} present only in Neon`);
    await insertRows(target, table, insertCols, prepared, "on conflict do nothing");

    if (APPLY) {
      const after = await target.unsafe(`select id, slug from "${table}"`);
      const nowBySlug = new Map<string, number>();
      for (const r of after) nowBySlug.set(String(r.slug), Number(r.id));
      for (const row of missing) {
        const id = nowBySlug.get(String(row.slug));
        if (id !== undefined) map.set(Number(row.id), id);
      }
    }
  }
  return map;
}

async function restoreCreations(source: postgres.Sql, target: postgres.Sql) {
  const cols = (await columnsOf(target, "creations")).filter((c) => !c.generated);
  const srcColNames = new Set((await columnsOf(source, "creations")).map((c) => c.name));
  const usable = cols.filter((c) => srcColNames.has(c.name));
  const names = new Set(usable.map((c) => c.name));

  const srcRows = (await source.unsafe(
    `select ${usable.map((c) => `"${c.name}"`).join(", ")} from "creations"`,
  )) as unknown as Record<string, unknown>[];
  const tgtIds = new Set(
    (await target.unsafe(`select id from "creations"`)).map((r) => String(r.id)),
  );

  const toInsert = srcRows.filter((r) => !tgtIds.has(String(r.id)));
  const toUpdate = srcRows.filter((r) => tgtIds.has(String(r.id)));
  console.log(
    `    ${srcRows.length} in Neon — ${toInsert.length} new, ${toUpdate.length} already present`,
  );

  // short_id is UNIQUE, so clear the space before replaying Neon's values.
  if (APPLY) await target.unsafe(`update "creations" set short_id = null`);

  await insertRows(target, "creations", usable, toInsert, "on conflict (id) do nothing");

  const curation = CREATION_CURATION_COLUMNS.filter((c) => names.has(c));
  let updated = 0;
  for (const row of toUpdate) {
    if (!APPLY) {
      updated++;
      continue;
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const c of curation) {
      const col = usable.find((x) => x.name === c);
      if (!col) continue;
      params.push(bind(col, row[c]));
      sets.push(`"${c}" = ${placeholder(col, params.length)}`);
    }
    if (sets.length === 0) break;
    params.push(row.id);
    await target.unsafe(
      `update "creations" set ${sets.join(", ")} where id = $${params.length}`,
      params as never[],
    );
    updated++;
  }
  console.log(`    curation fields restored on ${updated} row(s)`);

  if (APPLY && names.has("short_id")) {
    let replayed = 0;
    for (const row of srcRows) {
      if (row.short_id == null) continue;
      await target.unsafe(`update "creations" set short_id = $1 where id = $2`, [
        row.short_id,
        row.id,
      ] as never[]);
      replayed++;
    }
    const seqRow = await target.unsafe(
      `select pg_get_serial_sequence('public.creations','short_id') as seq`,
    );
    const seq = seqRow[0] && seqRow[0].seq;
    if (seq) {
      const maxRow = await target.unsafe(
        `select coalesce(max(short_id), 0)::int as m from "creations"`,
      );
      await target.unsafe(`select setval('${seq}', ${Number(maxRow[0].m) + 1}, false)`);
      const filled = await target.unsafe(
        `update "creations" set short_id = nextval('${seq}')
         where short_id is null and status in ('approved','archived','deleted')`,
      );
      console.log(
        `    short_id: ${replayed} restored from Neon, ${filled.count ?? 0} reassigned to Supabase-only rows`,
      );
    }
  }
}

async function reanchorSequences(target: postgres.Sql) {
  // Restricted to `public`: the database also carries Supabase's own schemas
  // and drizzle's migration bookkeeping, whose sequences are none of our
  // business and whose tables are not reachable on the default search_path.
  const seqs = await target`
    select c.relname as seq, t.relname as tbl, a.attname as col
    from pg_class c
    join pg_namespace cn on cn.oid = c.relnamespace and cn.nspname = 'public'
    join pg_depend d on d.objid = c.oid and d.classid = 'pg_class'::regclass
    join pg_class t on t.oid = d.refobjid
    join pg_namespace tn on tn.oid = t.relnamespace and tn.nspname = 'public'
    join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    where c.relkind='S'`;
  for (const s of seqs) {
    const r = await target.unsafe(
      `select coalesce(max("${s.col}"), 0)::bigint as m from "${s.tbl}"`,
    );
    const cur = await target.unsafe(`select last_value from "${s.seq}"`);
    // setval(..., true) means "this value is used", so pass the current max
    // rather than max+1 — otherwise every run burns an id. Never drop below
    // the reserved floor: post-migration rows depend on staying above Neon's
    // id space. Floor of 1 because setval rejects 0 on a minvalue-1 sequence.
    const next = Math.max(Number(r[0].m), Number(cur[0].last_value), 1);
    if (APPLY) await target.unsafe(`select setval('${s.seq}', ${next}, true)`);
  }
  console.log(`  re-anchored ${seqs.length} sequences (floor ${ID_FLOOR} preserved)`);
}

async function main() {
  console.log(APPLY ? "APPLYING restore\n" : "DRY RUN — pass --apply to commit\n");

  const source = postgres(neonUrl(), {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 30,
  });
  const target = postgres(process.env.DATABASE_URL as string, {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 30,
  });

  // Check the marker before opening Neon at all — the whole point is to avoid
  // spending quota on a restore that already happened.
  const done = await target`
    select enabled from site_flags where key = ${RESTORE_FLAG}`;
  if (done.length > 0 && done[0].enabled === true && !FORCE) {
    console.log(
      `Already restored (site_flags.${RESTORE_FLAG} is set) — Neon was not contacted.\n` +
        "Pass --force to run it again anyway.",
    );
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
    return;
  }

  try {
    await source`select 1`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/compute time quota|402/i.test(msg)) {
      console.error(
        "Neon is still quota-locked — nothing was read.\n" +
          "The quota resets at 2026-09-01T00:00:00Z; re-run any time after that.",
      );
    } else {
      console.error("Could not reach Neon:", msg);
    }
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
    process.exit(2);
  }
  console.log("Neon is reachable — starting.\n");

  const maps: Record<string, Map<number, number>> = {};
  const summary: Array<{ table: string; read: number; written: number }> = [];

  for (const table of TABLE_ORDER) {
    if (ONLY.length > 0 && !ONLY.includes(table)) continue;
    const exists = await source`
      select 1 from information_schema.tables
      where table_schema='public' and table_name=${table}`;
    if (exists.length === 0) {
      console.log(`  ${table}: not present in Neon — skipped`);
      continue;
    }
    console.log(`  ${table}`);

    if (table === "categories") {
      maps.categories = await buildSlugMap(source, target, "categories");
      summary.push({ table, read: maps.categories.size, written: 0 });
      continue;
    }
    if (table === "tags") {
      maps.tags = await buildSlugMap(source, target, "tags", maps.categories);
      summary.push({ table, read: maps.tags.size, written: 0 });
      continue;
    }
    if (table === "creations") {
      await restoreCreations(source, target);
      summary.push({ table, read: 0, written: 0 });
      continue;
    }

    const cols = (await columnsOf(target, table)).filter((c) => !c.generated);
    const srcCols = new Set((await columnsOf(source, table)).map((c) => c.name));
    const usable = cols.filter((c) => srcCols.has(c.name));
    if (usable.length === 0) {
      console.log(`    no shared columns — skipped`);
      continue;
    }
    const rows = (await source.unsafe(
      `select ${usable.map((c) => `"${c.name}"`).join(", ")} from "${table}"`,
    )) as unknown as Record<string, unknown>[];

    for (const rule of REMAP[table] ?? []) {
      const map = maps[rule.via];
      if (!map) continue;
      for (const row of rows) {
        const v = row[rule.column];
        if (v != null) row[rule.column] = map.get(Number(v)) ?? null;
      }
    }
    const before = rows.length;
    const clean = rows.filter((r) =>
      (REMAP[table] ?? []).every((rule) => r[rule.column] != null),
    );
    if (clean.length !== before) {
      console.log(`    ! ${before - clean.length} row(s) dropped: unmappable reference`);
    }

    const written = await insertRows(target, table, usable, clean, "on conflict do nothing");
    console.log(`    ${before} read -> ${written} written`);
    summary.push({ table, read: before, written });
  }

  await reanchorSequences(target);

  console.log("\n=== SUMMARY ===");
  for (const s of summary) {
    console.log(
      `  ${s.table.padEnd(28)} read=${String(s.read).padStart(7)} written=${String(s.written).padStart(7)}`,
    );
  }
  if (APPLY && ONLY.length === 0) {
    // Only a full run earns the marker; a --only run restored part of the data
    // and must not convince the next run that everything is across.
    await target`
      insert into site_flags (key, enabled, updated_at)
      values (${RESTORE_FLAG}, true, now())
      on conflict (key) do update set enabled = true, updated_at = now()`;
    console.log(`\nMarked site_flags.${RESTORE_FLAG} — Neon will not be read again.`);
  }

  console.log(
    APPLY ? "\nRestore complete." : "\nDry run complete — nothing was changed.",
  );

  await source.end({ timeout: 5 });
  await target.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
