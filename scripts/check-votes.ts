import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const counts = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE votes_up IS NULL AND votes_down IS NULL) AS both_null,
      COUNT(*) FILTER (WHERE (votes_up IS NOT NULL OR votes_down IS NOT NULL) AND COALESCE(votes_up,0) + COALESCE(votes_down,0) = 0) AS zero_votes,
      COUNT(*) FILTER (WHERE COALESCE(votes_up,0) + COALESCE(votes_down,0) BETWEEN 1 AND 4) AS one_to_four,
      COUNT(*) FILTER (WHERE COALESCE(votes_up,0) + COALESCE(votes_down,0) >= 5) AS five_plus,
      COUNT(*) FILTER (WHERE vote_score IS NOT NULL AND (votes_up IS NULL OR votes_down IS NULL)) AS score_but_null_counts,
      COUNT(*) AS total
    FROM creations WHERE status = 'approved'
  `);
  console.log("Vote breakdown:", counts.rows);

  const samples = await db.execute(sql`
    SELECT id, title, vote_score, votes_up, votes_down, subscriptions
    FROM creations
    WHERE status = 'approved' AND vote_score IS NOT NULL AND (votes_up IS NULL OR votes_down IS NULL OR COALESCE(votes_up,0)+COALESCE(votes_down,0) < 5)
    ORDER BY RANDOM()
    LIMIT 10
  `);
  console.log("\nSamples with score but sparse vote data:");
  for (const r of samples.rows) console.log(r);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
