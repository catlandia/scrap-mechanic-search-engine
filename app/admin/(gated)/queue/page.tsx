import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, creations, creationTags, tags } from "@/lib/db/schema";
import { QueueItem } from "@/components/admin/QueueItem";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const db = getDb();

  const pending = await db
    .select()
    .from(creations)
    .where(eq(creations.status, "pending"))
    .orderBy(desc(creations.subscriptions))
    .limit(20);

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
  if (pending.length > 0) {
    const rows = await db
      .select({
        creationId: creationTags.creationId,
        tagId: creationTags.tagId,
        source: creationTags.source,
        confidence: creationTags.confidence,
      })
      .from(creationTags)
      .where(inArray(
        creationTags.creationId,
        pending.map((p) => p.id),
      ));
    for (const r of rows) {
      const list = suggestedMap.get(r.creationId) ?? [];
      list.push({ tagId: r.tagId, source: r.source, confidence: r.confidence });
      suggestedMap.set(r.creationId, list);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <span className="text-sm text-white/50">
          Showing up to 20 pending, sorted by Steam subscriptions.
        </span>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-6 text-white/60">
          Nothing pending. Kick off an ingest run from{" "}
          <a href="/admin/ingest" className="text-accent hover:underline">
            /admin/ingest
          </a>
          .
        </div>
      ) : (
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
      )}
    </div>
  );
}
