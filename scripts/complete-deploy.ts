import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, isNull, sql } from "drizzle-orm";
import { deployAnnouncements } from "../lib/db/schema";

// Runs during the Vercel build, right after `next build` finishes. Marks
// the most recent uncompleted deploy announcement as done — the next time
// any client polls /api/deploy-announcement they see completedAt set and
// auto-reload onto the new bundle. If no announcement is pending (a bare
// `git push` without `npm run deploy`), this is a no-op.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // During preview builds or local `next build` DATABASE_URL may be
    // absent; skip silently. The banner feature is only meaningful on
    // prod anyway.
    console.log("complete-deploy: DATABASE_URL not set, skipping.");
    return;
  }

  const db = drizzle(neon(url));
  const result = await db
    .update(deployAnnouncements)
    .set({ completedAt: sql`now()` })
    .where(
      and(
        isNull(deployAnnouncements.completedAt),
        sql`${deployAnnouncements.id} = (
          SELECT id FROM ${deployAnnouncements}
          WHERE completed_at IS NULL
          ORDER BY scheduled_at DESC
          LIMIT 1
        )`,
      ),
    )
    .returning({ id: deployAnnouncements.id });

  if (result.length > 0) {
    console.log(`complete-deploy: marked announcement #${result[0].id} as live.`);
  } else {
    console.log("complete-deploy: no pending announcement, nothing to mark.");
  }
}

main().catch((err) => {
  // Never fail the build on this — a failed mark just leaves the banner
  // showing "Deploying now…" for a while and the user can refresh
  // manually.
  console.error("complete-deploy failed (non-fatal):", err);
});
