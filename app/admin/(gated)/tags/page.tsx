import { getDb } from "@/lib/db/client";
import { categories, tags, type Category, type Tag } from "@/lib/db/schema";
import { createCategory, createTag, updateTag } from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const db = getDb();
  const [user, allCategories, allTags] = await Promise.all([
    getCurrentUser(),
    db.select().from(categories).orderBy(categories.name),
    db.select().from(tags).orderBy(tags.name),
  ]);
  const creatorView = isCreator(effectiveRole(user));

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
          {creatorView && (
            <span className="ml-2 text-purple-300">
              · click any tag to edit
            </span>
          )}
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
              <TagGroup
                key={cat.id}
                label={cat.name}
                tags={bucket}
                allCategories={allCategories}
                creatorView={creatorView}
              />
            );
          })}
          {(tagsByCategory.get(null)?.length ?? 0) > 0 && (
            <TagGroup
              label="Uncategorised"
              tags={tagsByCategory.get(null)!}
              allCategories={allCategories}
              creatorView={creatorView}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function TagGroup({
  label,
  tags,
  allCategories,
  creatorView,
}: {
  label: string;
  tags: Tag[];
  allCategories: Category[];
  creatorView: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) =>
          creatorView ? (
            <TagChipEditable key={t.id} tag={t} allCategories={allCategories} />
          ) : (
            <span
              key={t.id}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-white/80"
            >
              {t.name} <span className="text-white/40">· {t.slug}</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function TagChipEditable({
  tag,
  allCategories,
}: {
  tag: Tag;
  allCategories: Category[];
}) {
  return (
    <details className="group rounded-md border border-border bg-card/60 text-xs">
      <summary className="cursor-pointer list-none rounded-md px-2.5 py-0.5 text-white/80 hover:bg-white/5 group-open:rounded-b-none group-open:border-b group-open:border-border">
        {tag.name} <span className="text-white/40">· {tag.slug}</span>
        <span className="ml-2 text-[10px] text-purple-300 group-open:hidden">
          edit
        </span>
      </summary>
      <form action={updateTag} className="grid gap-2 p-3 sm:grid-cols-4">
        <input type="hidden" name="tagId" value={tag.id} />
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/40">
            Name
          </span>
          <input
            name="name"
            defaultValue={tag.name}
            required
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/40">
            Slug
          </span>
          <input
            name="slug"
            defaultValue={tag.slug}
            required
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/40">
            Category
          </span>
          <select
            name="categoryId"
            defaultValue={tag.categoryId ?? ""}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">— no category —</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded bg-accent px-3 py-1 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Save
          </button>
        </div>
        <p className="text-[11px] text-amber-200/70 sm:col-span-4">
          Changing the slug breaks any existing <code>/search?tags=&lt;old-slug&gt;</code>{" "}
          link. Safe for fixing typos; be deliberate about renames.
        </p>
      </form>
    </details>
  );
}
