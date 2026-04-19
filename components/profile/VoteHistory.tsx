import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { cardColumns, type CreationCardRow } from "@/lib/db/queries";
import { creationVotes, creations } from "@/lib/db/schema";
import { CreationCard } from "@/components/CreationCard";
import { getRatingMode } from "@/lib/prefs.server";

interface VoteHistoryRow extends CreationCardRow {
  voteValue: number;
}

export async function VoteHistory({
  steamid,
  viewerSteamid,
}: {
  steamid: string;
  viewerSteamid: string | null;
}) {
  if (viewerSteamid !== steamid) return null;

  const db = getDb();
  const rows = (await db
    .select({ ...cardColumns, voteValue: creationVotes.value })
    .from(creationVotes)
    .innerJoin(creations, eq(creations.id, creationVotes.creationId))
    .where(
      and(
        eq(creationVotes.userId, steamid),
        eq(creations.status, "approved"),
      ),
    )
    .orderBy(desc(creationVotes.createdAt))
    .limit(24)) as VoteHistoryRow[];

  if (rows.length === 0) return null;

  const ratingMode = await getRatingMode();

  return (
    <section className="rounded-md border border-border bg-card/60 px-4 py-5">
      <div className="mb-3 text-[10px] uppercase tracking-widest text-foreground/40">
        Vote history
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const { voteValue, ...creation } = row;
          const isUp = voteValue > 0;
          const badgeClass = isUp
            ? "bg-emerald-500/80 text-foreground"
            : "bg-red-500/80 text-foreground";
          return (
            <div key={creation.id} className="relative">
              <CreationCard creation={creation} ratingMode={ratingMode} />
              {/* CreationCard already pins the #shortId badge at top-right
                  of the thumbnail. Anchor the vote overlay just left of it
                  (with a 4px gap) so the ID stays readable. */}
              <span
                className={`absolute top-2 right-12 z-10 rounded-full px-2 py-0.5 text-xs font-bold shadow-md ${badgeClass}`}
                title={isUp ? "You upvoted this" : "You downvoted this"}
                aria-label={isUp ? "Upvoted" : "Downvoted"}
              >
                {isUp ? "\u2191" : "\u2193"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
