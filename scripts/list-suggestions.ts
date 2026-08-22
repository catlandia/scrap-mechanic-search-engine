import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  const counts = await sql`SELECT status, COUNT(*) AS n FROM feature_suggestions GROUP BY status`;
  console.log("Counts by status:");
  for (const r of counts as Array<{ status: string; n: number }>) {
    console.log(`  ${r.status}: ${r.n}`);
  }
  console.log("\nMost recent 25:");
  const rows = await sql`
    SELECT id, status, title, created_at
    FROM feature_suggestions
    ORDER BY created_at DESC
    LIMIT 25
  `;
  for (const r of rows as Array<{ id: number; status: string; title: string }>) {
    console.log(`#${r.id} [${r.status}] ${r.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
