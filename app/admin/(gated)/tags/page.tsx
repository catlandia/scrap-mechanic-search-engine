import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, tags } from "@/lib/db/schema";
import { createCategory, createTag } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const db = getDb();
  const allCategories = await db.select().from(categories).orderBy(categories.name);
  const allTags = await db.select().from(tags).orderBy(tags.name);

  const tagsByCategory = new Map<number | null, typeof allTags>();
  for (const t of allTags) {
    const key = t.categoryId ?? null;
    const bucket = tagsByCategory.get(key) ?? [];
    bucket.push(t);
    tagsByCategory.set(key, bucket);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Taxonomy</h1>
        <p className="text-sm text-white/50">
          {allCategories.length} categories · {allTags.length} tags
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          Categories
        </h2>
        <form
          action={createCategory}
          className="grid gap-2 rounded-md border border-border bg-card p-4 sm:grid-cols-4"
        >
          <input
            name="slug"
            placeholder="slug"
            required
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="rounded border border-border bg-background px-2 py-1 text-sm sm:col-span-1"
          />
          <button type="submit" className="rounded bg-accent px-3 py-1 text-sm font-medium text-black">
            Add / update category
          </button>
        </form>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allCategories.map((c) => (
            <li key={c.id} className="rounded border border-border bg-card/60 px-3 py-2 text-sm">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-white/40">{c.slug}</div>
              {c.description && <div className="mt-1 text-xs text-white/60">{c.description}</div>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Tags</h2>
        <form
          action={createTag}
          className="grid gap-2 rounded-md border border-border bg-card p-4 sm:grid-cols-4"
        >
          <input
            name="slug"
            placeholder="slug"
            required
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <select
            name="categoryId"
            defaultValue=""
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">— no category —</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-accent px-3 py-1 text-sm font-medium text-black">
            Add / update tag
          </button>
        </form>

        <div className="space-y-4">
          {allCategories.map((cat) => {
            const bucket = tagsByCategory.get(cat.id);
            if (!bucket || bucket.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="mb-1 text-xs uppercase tracking-wide text-white/40">{cat.name}</div>
                <div className="flex flex-wrap gap-2">
                  {bucket.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-white/80"
                    >
                      {t.name} <span className="text-white/40">· {t.slug}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {(tagsByCategory.get(null)?.length ?? 0) > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-white/40">
                Uncategorised
              </div>
              <div className="flex flex-wrap gap-2">
                {tagsByCategory.get(null)!.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-white/80"
                  >
                    {t.name} <span className="text-white/40">· {t.slug}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
