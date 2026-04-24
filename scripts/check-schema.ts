import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  console.log("=== users columns ===");
  const userCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `;
  for (const c of userCols) console.log(`  ${c.column_name}`);

  console.log("\n=== deploy_announcements columns ===");
  const depCols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deploy_announcements'
    ORDER BY ordinal_position
  `;
  if (depCols.length === 0) console.log("  (table does not exist)");
  for (const c of depCols) console.log(`  ${c.column_name}`);

  console.log("\n=== applied migrations (drizzle journal) ===");
  try {
    const mig = await sql`SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 15`;
    for (const m of mig) console.log(`  ${m.id} | ${m.created_at}`);
  } catch (e) {
    console.log(`  error: ${(e as Error).message}`);
  }

  console.log("\n=== mod_actions ===");
  const ma = await sql`
    SELECT COUNT(*)::int AS c FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mod_actions'
  `;
  console.log(`  exists: ${Number(ma[0].c) > 0}`);

  console.log("\n=== tags.created_at ===");
  const tagCA = await sql`
    SELECT COUNT(*)::int AS c FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tags' AND column_name='created_at'
  `;
  console.log(`  exists: ${Number(tagCA[0].c) > 0}`);
}

main().catch(e => { console.error(e); process.exit(1); });
