import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations, creationTags, tags } from "@/lib/db/schema";
import { TriageStack, type TriageCard } from "@/components/admin/TriageStack";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

export default async function TriagePage() {
  const db = getDb();

  const [pending, totalRow, communityRow] = await Promise.all([
    db
      .select()
      .from(creations)
      .where(eq(creations.status, "pending"))
      // Community-submitted rows float to the top of the stack — someone
      // took the trouble to flag them through /submit, so handle those
      // before chewing through the auto-ingested trending backlog. Within
      // each group, most-popular first stays the best tiebreaker.
      .orderBy(
        sql`${creations.uploadedByUserId} is not null desc, ${creations.subscriptions} desc`,
      )
      .limit(BATCH_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(creations)
      .where(eq(creations.status, "pending"))
      .then((r) => r[0]),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(creations)
      .where(
        and(
          eq(creations.status, "pending"),
          isNotNull(creations.uploadedByUserId),
        ),
      )
      .then((r) => r[0]),
  ]);

  const ids = pending.map((p) => p.id);
  const tagRows =
    ids.length > 0
      ? await db
          .select({
            creationId: creationTags.creationId,
            tagId: creationTags.tagId,
            name: tags.name,
          })
          .from(creationTags)
          .innerJoin(tags, eq(creationTags.tagId, tags.id))
          .where(inArray(creationTags.creationId, ids))
      : [];

  const tagsByCreation = new Map<string, { id: number; name: string }[]>();
  for (const r of tagRows) {
    const list = tagsByCreation.get(r.creationId) ?? [];
    list.push({ id: r.tagId, name: r.name });
    tagsByCreation.set(r.creationId, list);
  }

  const cards: TriageCard[] = pending.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.descriptionClean,
    thumbnailUrl: c.thumbnailUrl,
    steamUrl: c.steamUrl,
    kind: c.kind,
    subscriptions: c.subscriptions,
    favorites: c.favorites,
    voteScore: c.voteScore,
    authorName: c.authorName,
    steamTags: c.steamTags ?? [],
    tags: tagsByCreation.get(c.id) ?? [],
    communitySubmitted: !!c.uploadedByUserId,
  }));

  return (
    <TriageStack
      cards={cards}
      totalPending={totalRow?.n ?? cards.length}
      communityPending={communityRow?.n ?? 0}
    />
  );
}
