import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { cardColumns, type CreationCardRow } from "@/lib/db/queries";
import { CreationGrid } from "@/components/CreationCard";
import { getRatingMode } from "@/lib/prefs.server";

export async function SubmittedItems({ steamid }: { steamid: string }) {
  const db = getDb();
  const rows = (await db
    .select(cardColumns)
    .from(creations)
    .where(
      and(
        eq(creations.uploadedByUserId, steamid),
        eq(creations.status, "approved"),
      ),
    )
    .orderBy(desc(creations.approvedAt))
    .limit(24)) as CreationCardRow[];

  if (rows.length === 0) return null;

  const ratingMode = await getRatingMode();

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/60 px-4 py-5">
      <h2 className="text-xs uppercase tracking-widest text-foreground/40">
        Submitted to the site
      </h2>
      <CreationGrid items={rows} ratingMode={ratingMode} />
    </section>
  );
}
