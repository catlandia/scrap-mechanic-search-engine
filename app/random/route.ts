import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { HIGH_VOLUME_THIN_CONDITION } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// "Surprise me" jump — picks one random approved creation and redirects to
// its detail page. The thinning predicate keeps tiles + worlds from
// dominating the roll (they're 25 % of the corpus but visitors don't browse
// them anywhere near that often). No personalization yet — this stays
// signed-out friendly and keeps the hop cheap (one indexed query, one
// 307 redirect, no auth touch).
export async function GET() {
  const db = getDb();
  const [row] = await db
    .select({ id: creations.id, shortId: creations.shortId })
    .from(creations)
    .where(sql`${creations.status} = 'approved' AND ${HIGH_VOLUME_THIN_CONDITION}`)
    .orderBy(sql`random()`)
    .limit(1);

  if (!row) {
    // Nothing approved yet — bounce back to /new with a flag the page
    // could surface later. For now, fall through to home.
    redirect("/");
  }

  redirect(`/creation/${row.shortId ?? row.id}`);
}
