import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { badgeAutogrants, userBadges, users } from "@/lib/db/schema";
import { BETA_END_DATE } from "@/lib/badges/definitions";

// Idempotent one-shot: grants the auto-badges to every eligible existing
// user. Safe to re-run. Run with: npx tsx scripts/backfill-badges.ts

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

async function backfillAutogrants() {
  const db = getDb();
  // Join autogrants → users so we only try to grant to users that actually
  // exist (user_badges has a FK to users). Unsigned autogrants wait until
  // the user first signs in, at which point applyAutogrants() picks them up.
  const matched = await db
    .select({ steamid: users.steamid, slug: badgeAutogrants.slug })
    .from(badgeAutogrants)
    .innerJoin(users, eq(users.steamid, badgeAutogrants.steamid));
  console.log(
    `[badges] ${matched.length} autogrant rows match an existing user.`,
  );
  if (matched.length === 0) return;
  await db
    .insert(userBadges)
    .values(
      matched.map((m) => ({
        userId: m.steamid,
        badgeSlug: m.slug,
        grantedByUserId: null,
      })),
    )
    .onConflictDoNothing();
}

async function main() {
  await backfillBetatester();
  await backfillAutogrants();
  console.log("[badges] Done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
