import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { and, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userBadges, users } from "@/lib/db/schema";
import {
  BETA_END_DATE,
  INFLUENCER_STEAMIDS,
} from "@/lib/badges/definitions";

// One-shot: applies the auto-grant rules against every existing user.
// Idempotent (ON CONFLICT DO NOTHING) so safe to re-run after editing
// INFLUENCER_STEAMIDS. Run with: npx tsx scripts/backfill-badges.ts

async function backfillBetatester() {
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
  console.log(`[badges] ${eligible.length} users eligible for betatester.`);
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
}

async function backfillInfluencer() {
  if (INFLUENCER_STEAMIDS.length === 0) {
    console.log("[badges] INFLUENCER_STEAMIDS is empty — nothing to grant.");
    return;
  }
  const db = getDb();
  // Only grant to steamids already present in `users`. Not-yet-signed-in
  // influencers will be picked up by the Steam return handler on first login.
  const present = await db
    .select({ steamid: users.steamid })
    .from(users)
    .where(inArray(users.steamid, INFLUENCER_STEAMIDS));
  console.log(
    `[badges] ${present.length}/${INFLUENCER_STEAMIDS.length} influencers already in users; granting.`,
  );
  if (present.length === 0) return;
  await db
    .insert(userBadges)
    .values(
      present.map((u) => ({
        userId: u.steamid,
        badgeSlug: "influencer",
        grantedByUserId: null,
      })),
    )
    .onConflictDoNothing();
}

async function main() {
  await backfillBetatester();
  await backfillInfluencer();
  console.log("[badges] Done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
