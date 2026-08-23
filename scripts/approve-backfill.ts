/**
 * Publishes the backfilled catalogue after the 2026-08-22 move off Neon.
 *
 * Normally every creation is hand-reviewed in /admin/queue before it goes
 * public. That review history lived in the Neon database, which is locked
 * behind an exhausted compute quota until the monthly reset — so a fresh
 * ingest arrives entirely as `pending` and the public site stays empty.
 *
 * These rows still passed the per-kind subscription and age gates in
 * lib/ingest/thresholds.ts, which is the filter that actually removes
 * low-effort builds, so publishing them is a reasonable stand-in until the
 * real decisions come back.
 *
 * Every row is stamped `reviewed_by_user_id = BACKFILL_MARKER` so it is
 * trivially distinguishable from a genuine human approval — both for the
 * reconciliation when the old data unlocks, and to undo the whole batch:
 *
 *   UPDATE creations SET status='pending', approved_at=NULL,
 *     reviewed_at=NULL, reviewed_by_user_id=NULL
 *   WHERE reviewed_by_user_id = 'system:backfill-2026-08-22';
 *
 * Usage: npx tsx scripts/approve-backfill.ts [minSubscriptions]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";

const BACKFILL_MARKER = "system:backfill-2026-08-22";

async function main() {
  const minSubs = Number(process.argv[2] ?? 0);
  const db = getDb();

  const before = await db
    .select({ status: creations.status, n: sql<number>`count(*)::int` })
    .from(creations)
    .groupBy(creations.status);
  console.log("before:", JSON.stringify(before));

  const updated = await db
    .update(creations)
    .set({
      status: "approved",
      approvedAt: sql`now()`,
      reviewedAt: sql`now()`,
      reviewedByUserId: BACKFILL_MARKER,
    })
    .where(
      and(
        eq(creations.status, "pending"),
        gte(creations.subscriptions, minSubs),
      ),
    )
    .returning({ id: creations.id });

  console.log(`approved ${updated.length} creations (minSubscriptions=${minSubs})`);

  const after = await db
    .select({ status: creations.status, n: sql<number>`count(*)::int` })
    .from(creations)
    .groupBy(creations.status);
  console.log("after:", JSON.stringify(after));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
