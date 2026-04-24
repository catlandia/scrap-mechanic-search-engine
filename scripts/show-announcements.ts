import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  const rows = await sql`SELECT id, scheduled_at, completed_at, created_at FROM deploy_announcements ORDER BY id DESC LIMIT 10`;
  for (const r of rows) console.log(r);
}

main().catch(e => { console.error(e); process.exit(1); });
