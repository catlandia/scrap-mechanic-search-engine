import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  CREATION_KINDS,
  creations,
  creationTags,
  tags,
  type CreationKind,
} from "@/lib/db/schema";
import { TriageStack, type TriageCard } from "@/components/admin/TriageStack";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

type SearchParams = Promise<{ kind?: string }>;

export default async function TriagePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeKind = (CREATION_KINDS as readonly string[]).includes(
    params.kind ?? "",
  )
    ? (params.kind as CreationKind)
    : null;

  const db = getDb();

  const filterWhere = activeKind
    ? and(eq(creations.status, "pending"), eq(creations.kind, activeKind))
    : eq(creations.status, "pending");

  const [pending, totalRow, communityRow, kindBreakdown] = await Promise.all([
    db
      .select()
      .from(creations)
      .where(filterWhere)
      // Community-submitted rows float to the top of the stack — someone
      // took the trouble to flag them through /submit, so handle those
      // before chewing through the auto-ingested trending backlog. Within
      // each group, most-popular first stays the best tiebreaker. The
      // kind filter (if any) narrows the pool before this ordering, so
      // community rows still lead within the filtered kind.
      .orderBy(
        sql`${creations.uploadedByUserId} is not null desc, ${creations.subscriptions} desc`,
      )
      .limit(BATCH_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(creations)
      .where(filterWhere)
      .then((r) => r[0]),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(creations)
      .where(and(filterWhere, isNotNull(creations.uploadedByUserId)))
      .then((r) => r[0]),
    // Per-kind totals across the whole pending pool (ignoring the active
    // filter) so every filter pill can show its own count — switching
    // between filters shouldn't hide the sizes of the other buckets.
    db
      .select({
        kind: creations.kind,
        total: sql<number>`count(*)::int`,
        community: sql<number>`count(*) filter (where ${creations.uploadedByUserId} is not null)::int`,
      })
      .from(creations)
      .where(eq(creations.status, "pending"))
      .groupBy(creations.kind),
  ]);

  const kindCounts: Record<string, { total: number; community: number }> = {};
  for (const row of kindBreakdown) {
    kindCounts[row.kind] = { total: row.total, community: row.community };
  }

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
      activeKind={activeKind}
      kindCounts={kindCounts}
    />
  );
}
