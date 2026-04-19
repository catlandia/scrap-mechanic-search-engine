import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { getDb } from "@/lib/db/client";
import { badgeAutogrants } from "@/lib/db/schema";

// One-shot: seed the former hardcoded INFLUENCER_STEAMIDS into the new
// badge_autogrants table. Remove this script once run.
const SEEDS: Array<{ steamid: string; label: string }> = [
  {
    steamid: "76561197994708053",
    label: "glykaman — steamcommunity.com/id/glykaman",
  },
];

async function main() {
  const db = getDb();
  await db
    .insert(badgeAutogrants)
    .values(
      SEEDS.map((s) => ({
        slug: "influencer",
        steamid: s.steamid,
        label: s.label,
        addedByUserId: null,
      })),
    )
    .onConflictDoNothing();
  console.log(`[badges] Seeded ${SEEDS.length} influencer autogrants.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
