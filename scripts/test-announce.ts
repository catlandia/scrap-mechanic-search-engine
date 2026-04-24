import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  const scheduledAt = new Date(Date.now() + 60 * 1000);
  const rows = await sql`
    INSERT INTO deploy_announcements (scheduled_at)
    VALUES (${scheduledAt.toISOString()})
    RETURNING id, scheduled_at, completed_at
  `;
  console.log("Inserted test announcement:");
  console.log(rows[0]);
  console.log(`\nBanner will count down for 60s, then hold "Deploying now…" indefinitely.`);
  console.log(`When you're done testing, tell me and I'll stamp completed_at to end it.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
