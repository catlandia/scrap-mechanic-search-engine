import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { and, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userBadges, users } from "@/lib/db/schema";
import { BETA_END_DATE } from "@/lib/badges/definitions";

// One-shot: grant the 'betatester' badge to every existing user whose
// siteJoinedAt is before BETA_END_DATE. Idempotent — ON CONFLICT DO NOTHING.
async function main() {
  const db = getDb();
  const eligible = await db
    .select({ steamid: users.steamid })
    .from(users)
    .where(
      and(
        lt(users.siteJoinedAt, BETA_END_DATE),
        sql`${users.siteJoinedAt} is not null`,
      ),
    );
  console.log(`[backfill] ${eligible.length} users eligible for betatester.`);
  if (eligible.length === 0) return;

  await db
    .insert(userBadges)
    .values(
      eligible.map((u) => ({
        userId: u.steamid,
        badgeSlug: "betatester",
        grantedByUserId: null,
      })),
    )
    .onConflictDoNothing();
  console.log("[backfill] Done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
