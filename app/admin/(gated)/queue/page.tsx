import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, creations, creationTags, tagVotes, tags, users } from "@/lib/db/schema";
import { QueueItem } from "@/components/admin/QueueItem";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 30;

/**
 * Queue surface: approved creations that currently show zero public tags.
 * A tag counts as "public" when it's admin-confirmed OR it has ≥3 net
 * community upvotes. Admin works here to confirm tags until the item
 * falls off this list.
 */
export default async function QueuePage() {
  const db = getDb();

  const candidates = await db
    .select()
    .from(creations)
    .where(
      and(
        eq(creations.status, "approved"),
        // Exclude creations that already have an admin-confirmed (non-rejected) tag.
        sql`NOT EXISTS (
          SELECT 1 FROM creation_tags ct
          WHERE ct.creation_id = ${creations.id}
            AND ct.confirmed = true
            AND ct.rejected = false
        )`,
      ),
    )
    .orderBy(desc(creations.approvedAt))
    .limit(PAGE_LIMIT * 2);

  if (candidates.length === 0) {
    return <EmptyState />;
  }

  const candidateIds = candidates.map((c) => c.id);

  // Gather vote tallies so we can exclude creations that already have a
  // community-approved tag (≥3 net upvotes). Compute in JS rather than a
  // second SQL HAVING clause so neon-http keeps one round-trip.
  const voteRows = await db
    .select({
      creationId: tagVotes.creationId,
      tagId: tagVotes.tagId,
      value: tagVotes.value,
      rejected: creationTags.rejected,
    })
    .from(tagVotes)
    .innerJoin(
      creationTags,
      and(
        eq(creationTags.creationId, tagVotes.creationId),
        eq(creationTags.tagId, tagVotes.tagId),
      ),
    )
    .where(inArray(tagVotes.creationId, candidateIds));

  const netByPair = new Map<string, number>();
  for (const v of voteRows) {
    if (v.rejected) continue;
    const key = `${v.creationId}:${v.tagId}`;
    netByPair.set(key, (netByPair.get(key) ?? 0) + (v.value === 1 ? 1 : v.value === -1 ? -1 : 0));
  }
  const hasCommunityTag = new Set<string>();
  for (const [key, net] of netByPair) {
    if (net >= 3) {
      const [creationId] = key.split(":");
      hasCommunityTag.add(creationId);
    }
  }

  const pending = candidates
    .filter((c) => !hasCommunityTag.has(c.id))
    .slice(0, PAGE_LIMIT);

  if (pending.length === 0) {
    return <EmptyState />;
  }

  const pendingIds = pending.map((p) => p.id);

  const allTags = await db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      categoryId: tags.categoryId,
    })
    .from(tags)
    .orderBy(tags.name);

  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(categories.name);

  const suggestedMap = new Map<
    string,
    { tagId: number; source: string; confidence: number | null }[]
  >();
  const suggestedRows = await db
    .select({
      creationId: creationTags.creationId,
      tagId: creationTags.tagId,
      source: creationTags.source,
      confidence: creationTags.confidence,
    })
    .from(creationTags)
    .where(inArray(creationTags.creationId, pendingIds));
  for (const r of suggestedRows) {
    const list = suggestedMap.get(r.creationId) ?? [];
    list.push({ tagId: r.tagId, source: r.source, confidence: r.confidence });
    suggestedMap.set(r.creationId, list);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tagging queue</h1>
          <p className="text-sm text-white/60">
            Approved creations that don&apos;t yet have any public tag.
            Confirm at least one tag and the item drops off this list.
          </p>
        </div>
        <span className="text-sm text-white/50">
          Showing {pending.length}, newest approved first.
        </span>
      </header>

      <div className="space-y-4">
        {pending.map((c) => (
          <QueueItem
            key={c.id}
            creation={{
              id: c.id,
              title: c.title,
              descriptionClean: c.descriptionClean,
              thumbnailUrl: c.thumbnailUrl,
              steamUrl: c.steamUrl,
              kind: c.kind,
              subscriptions: c.subscriptions,
              favorites: c.favorites,
              voteScore: c.voteScore,
              authorName: c.authorName,
              steamTags: c.steamTags ?? [],
            }}
            suggested={suggestedMap.get(c.id) ?? []}
            allTags={allTags}
            allCategories={allCategories}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
      <div className="text-lg font-semibold">All approved items have tags.</div>
      <div className="mt-1 text-emerald-100/80">
        Nothing needs tag work right now. Triage more items from{" "}
        <a href="/admin/triage" className="underline hover:text-white">
          /admin/triage
        </a>{" "}
        or wait for the next ingest.
      </div>
    </div>
  );
}
