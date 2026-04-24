import { getDb } from "@/lib/db/client";
import { categories, tags, type Category, type Tag } from "@/lib/db/schema";
import { createCategory, createTag } from "@/app/admin/actions";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";
import { TagChipEditable } from "@/components/admin/TagChipEditable";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const db = getDb();
  const [user, allCategories, allTags] = await Promise.all([
    getCurrentUser(),
    // Narrow SELECT so this keeps working before the V9.1 migration runs
    // in prod — `SELECT *` on categories/tags would demand created_at +
    // created_by_user_id columns that may not exist yet.
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
      })
      .from(categories)
      .orderBy(categories.name),
    db
      .select({
        id: tags.id,
        slug: tags.slug,
        name: tags.name,
        categoryId: tags.categoryId,
      })
      .from(tags)
      .orderBy(tags.name),
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
        <p className="text-sm text-foreground/50">
          {allCategories.length} categories · {allTags.length} tags
          {creatorView && (
            <span className="ml-2 text-purple-300">
              · click any tag to edit
            </span>
          )}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
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
          <FormSubmitButton
            pendingLabel="Saving…"
            toastSuccess="Category saved."
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-black"
          >
            Add / update category
          </FormSubmitButton>
        </form>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allCategories.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 rounded border border-border bg-card/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-foreground/40">{c.slug}</div>
                {c.description && (
                  <div className="mt-1 text-xs text-foreground/60">
                    {c.description}
                  </div>
                )}
                <div className="mt-1 text-[10px] text-foreground/40">
                  {(tagsByCategory.get(c.id)?.length ?? 0)} tag
                  {(tagsByCategory.get(c.id)?.length ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
              {creatorView && (
                <DeleteCategoryButton
                  categoryId={c.id}
                  categoryName={c.name}
                  tagCount={tagsByCategory.get(c.id)?.length ?? 0}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">Tags</h2>
        <p className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          Tag names must be in English (A–Z, 0–9, spaces, and basic punctuation).
          Non-Latin scripts and accented letters are rejected server-side — the
          catalogue stays consistent across every UI language.
        </p>
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
          <FormSubmitButton
            pendingLabel="Saving…"
            toastSuccess="Tag saved."
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-black"
          >
            Add / update tag
          </FormSubmitButton>
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
  // Narrowed shape so the component takes whatever columns the page actually
  // selected (avoids demanding V9.1's created_at/_by_user_id columns that
  // may not yet exist in prod).
  tags: Pick<Tag, "id" | "slug" | "name" | "categoryId">[];
  allCategories: Pick<Category, "id" | "slug" | "name" | "description">[];
  creatorView: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-foreground/40">{label}</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) =>
          creatorView ? (
            <TagChipEditable key={t.id} tag={t} allCategories={allCategories} />
          ) : (
            <span
              key={t.id}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground/80"
            >
              {t.name} <span className="text-foreground/40">· {t.slug}</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

