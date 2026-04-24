import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { execSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { deployAnnouncements } from "../lib/db/schema";

// 75 seconds: long enough that active visitors on any page see the
// countdown tick down for a while and have a real chance to finish
// whatever they were doing, with ~15 s of slack on top of the old 60 s
// so finishing a sentence / confirming a triage card doesn't race the
// push. Short enough that it still doesn't feel like a hostage
// situation for the person deploying.
const COUNTDOWN_SECONDS = 75;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set — add it to .env.local before running `npm run deploy`.",
    );
    process.exit(1);
  }

  const db = drizzle(neon(url));
  const scheduledAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);

  console.log(
    `Announcing deploy for ${scheduledAt.toISOString()} (${COUNTDOWN_SECONDS}s from now)…`,
  );
  await db.insert(deployAnnouncements).values({ scheduledAt });
  console.log(
    `Banner is live for every visitor. Waiting ${COUNTDOWN_SECONDS}s before pushing…\n`,
  );

  for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
    process.stdout.write(`\r  T-${String(i).padStart(2, "0")}s…   `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\n\n");

  console.log("Pushing to origin…");
  execSync("git push", { stdio: "inherit" });
  console.log("\nDeploy triggered. Vercel is building now.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
