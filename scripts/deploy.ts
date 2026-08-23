import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, isNull, sql } from "drizzle-orm";
import { deployAnnouncements } from "../lib/db/schema";

// 60 seconds is long enough that active visitors on any page see the countdown
// tick down a few times before the Worker swaps under them, short enough that
// it doesn't feel like a hostage situation for the person deploying.
const COUNTDOWN_SECONDS = 60;

// The 60s visitor banner can be suspended for rapid-iteration sprints where
// warning every visitor before each deploy is more friction than value. Pass
// `--no-banner` (or set DEPLOY_SKIP_BANNER=1) to build + swap immediately with
// no announcement. Re-enable by simply omitting the flag.
//
// NEXT_PUBLIC_DEPLOY_BANNER is the other half of the switch: it's the flag the
// *client* reads (see components/DeployBanner.tsx). Unless it's "on", no
// browser is polling for announcements, so writing a row here would spend a
// 60s countdown talking to nobody. Announcing is therefore gated on both.
const BANNER_CLIENT_ENABLED = process.env.NEXT_PUBLIC_DEPLOY_BANNER === "on";
const SKIP_BANNER =
  process.argv.includes("--no-banner") ||
  process.env.DEPLOY_SKIP_BANNER === "1" ||
  !BANNER_CLIENT_ENABLED;

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set — add it to .env.local before deploying.");
    process.exit(1);
  }
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error(
      "CLOUDFLARE_API_TOKEN is not set — add it to .env.local so wrangler can deploy non-interactively.",
    );
    process.exit(1);
  }

  // Stamp the build with the current commit so the DeployBanner can tell the
  // freshly-deployed bundle apart from the one a visitor currently has loaded
  // (next.config bakes this into NEXT_PUBLIC_BUILD_ID).
  const sha = execSync("git rev-parse --short HEAD").toString().trim();
  process.env.CF_BUILD_SHA = sha;

  // 1. Build FIRST. The live Worker keeps serving the old bundle throughout,
  //    so the (slow) build causes zero visitor disruption — unlike the old
  //    Vercel flow where the banner fired at push time and the swap came
  //    minutes later.
  console.log(`Building deployment ${sha}…`);
  run("npx opennextjs-cloudflare build");

  const db = drizzle(postgres(dbUrl, { ssl: "require", max: 1, prepare: false }));

  if (!SKIP_BANNER) {
    // 2. Announce the deploy and hold for the countdown, so every live visitor
    //    gets the 60s banner + SFX before the Worker actually swaps.
    const scheduledAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);
    await db.insert(deployAnnouncements).values({ scheduledAt });
    console.log(
      `\nBanner is live for every visitor. Waiting ${COUNTDOWN_SECONDS}s before deploying…\n`,
    );
    for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
      process.stdout.write(`\r  T-${String(i).padStart(2, "0")}s…   `);
      await new Promise((r) => setTimeout(r, 1000));
    }
    process.stdout.write("\n");
  } else {
    console.log(
      BANNER_CLIENT_ENABLED
        ? "\n⚠  Banner suspended (--no-banner): swapping immediately, no visitor countdown.\n"
        : "\n⚠  Banner off (NEXT_PUBLIC_DEPLOY_BANNER is not 'on'): no browser is polling\n" +
            "   for announcements, so the countdown would warn nobody. Swapping immediately,\n" +
            "   and touching zero database queries on the way.\n",
    );
  }

  // 3. Swap the Worker. wrangler returns once the new version is live at the
  //    edge (a few seconds), so the swap is effectively atomic.
  run("npx wrangler deploy");

  if (!SKIP_BANNER) {
    // 4. Mark the announcement live → the next poll flips every visitor onto the
    //    new bundle. (This was scripts/complete-deploy.ts; its Vercel build gate
    //    is gone now that the deploy happens here, after the swap.)
    const result = await db
      .update(deployAnnouncements)
      .set({ completedAt: sql`now()` })
      .where(
        and(
          isNull(deployAnnouncements.completedAt),
          sql`${deployAnnouncements.id} = (
            SELECT id FROM ${deployAnnouncements}
            WHERE completed_at IS NULL AND is_prank = false
            ORDER BY scheduled_at DESC
            LIMIT 1
          )`,
        ),
      )
      .returning({ id: deployAnnouncements.id });

    if (result.length > 0) {
      console.log(`\nDeploy ${sha} is live — marked announcement #${result[0].id}.`);
    } else {
      console.log(`\nDeploy ${sha} is live.`);
    }
  } else {
    console.log(`\nDeploy ${sha} is live (banner skipped).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
