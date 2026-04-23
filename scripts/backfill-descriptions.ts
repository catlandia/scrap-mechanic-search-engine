import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import {
  getPublishedFileDetails,
  pickFullDescription,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";

/**
 * Refetch the full description for every approved / pending creation from
 * Steam's batch GetPublishedFileDetails endpoint, then rewrite
 * `descriptionRaw` + `descriptionClean` using `pickFullDescription`.
 *
 * Runs against the Web API (not the rate-limited HTML page scrape), so it
 * can chug through the whole catalogue in a couple of minutes without
 * getting 429'd. Cost: one API call per 100 rows.
 */
async function main() {
  const db = getDb();
  const rows = await db
    .select({
      id: creations.id,
      title: creations.title,
      prevLen: sql<number>`char_length(${creations.descriptionClean})`,
    })
    .from(creations)
    .where(sql`${creations.status} in ('approved', 'pending')`)
    .orderBy(creations.id);

  console.log(`${rows.length} creations to backfill.`);

  const BATCH = 100;
  let touched = 0;
  let grew = 0;
  let unchanged = 0;
  let empty = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const ids = chunk.map((r) => r.id);
    let details: Awaited<ReturnType<typeof getPublishedFileDetails>> = [];
    try {
      details = await getPublishedFileDetails(ids);
    } catch (err) {
      console.error(
        `  batch ${i}–${i + chunk.length} failed:`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }

    const byId = new Map(details.map((d) => [d.publishedfileid, d]));

    for (const row of chunk) {
      const d = byId.get(row.id);
      if (!d) {
        empty += 1;
        continue;
      }
      const raw = pickFullDescription(d);
      if (!raw) {
        empty += 1;
        continue;
      }
      const clean = stripBBCode(raw);
      const prevLen = row.prevLen ?? 0;
      const delta = clean.length - prevLen;

      try {
        await db
          .update(creations)
          .set({ descriptionRaw: raw, descriptionClean: clean })
          .where(eq(creations.id, row.id));
        touched += 1;
        if (delta > 50) {
          grew += 1;
          console.log(
            `  ${row.id} "${row.title}" · ${prevLen} → ${clean.length} chars (+${delta})`,
          );
        } else {
          unchanged += 1;
        }
      } catch (err) {
        console.error(
          `  ${row.id} update failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log(`  … ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    // Polite spacing between batches — the Steam Web API is far more
    // permissive than the HTML page scraper but still worth being nice to.
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nDone. Touched ${touched} rows (${grew} visibly longer, ${unchanged} same-or-similar). Empty Steam response on ${empty}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
