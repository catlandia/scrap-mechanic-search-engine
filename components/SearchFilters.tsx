"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Tag {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
}

interface Category {
  id: number;
  slug: string;
  name: string;
}

interface Props {
  allTags: Tag[];
  allCategories: Category[];
}

const KIND_OPTIONS = [
  { value: "", label: "All kinds" },
  { value: "blueprint", label: "Blueprints" },
  { value: "mod", label: "Mods" },
  { value: "world", label: "Worlds" },
  { value: "challenge", label: "Challenges" },
  { value: "tile", label: "Tiles" },
  { value: "custom_game", label: "Custom Games" },
  { value: "terrain_asset", label: "Terrain" },
];

export function SearchFilters({ allTags, allCategories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const kind = searchParams.get("kind") ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const q = searchParams.get("q") ?? "";
  const tagSlugs = useMemo(() => {
    const raw = searchParams.get("tags") ?? "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);
  const tagSet = useMemo(() => new Set(tagSlugs), [tagSlugs]);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      const query = next.toString();
      router.push(query ? `/search?${query}` : "/search");
    },
    [router, searchParams],
  );

  function toggleTag(slug: string) {
    const current = new Set(tagSlugs);
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    const next = Array.from(current).join(",");
    update({ tags: next || null });
  }

  const tagsByCategory = new Map<number | null, Tag[]>();
  for (const t of allTags) {
    const key = t.categoryId ?? null;
    const bucket = tagsByCategory.get(key) ?? [];
    bucket.push(t);
    tagsByCategory.set(key, bucket);
  }

  return (
    <aside className="space-y-5 rounded-lg border border-border bg-card/60 p-4 text-sm">
      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-widest text-white/50">Search</label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            update({ q: typeof value === "string" ? value : null });
          }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. sports car"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </form>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-white/50">Kind</div>
        <div className="flex flex-wrap gap-1.5">
          {KIND_OPTIONS.map((k) => (
            <button
              type="button"
              key={k.value || "all"}
              onClick={() => update({ kind: k.value || null })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                kind === k.value
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-background text-white/60 hover:border-white/30",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-white/50">Category</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => update({ category: null })}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition",
              !categorySlug
                ? "border-accent bg-accent/20 text-accent"
                : "border-border bg-background text-white/60 hover:border-white/30",
            )}
          >
            All
          </button>
          {allCategories.map((c) => (
            <button
              type="button"
              key={c.slug}
              onClick={() => update({ category: c.slug })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                categorySlug === c.slug
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-background text-white/60 hover:border-white/30",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-white/50">
          Tags{" "}
          {tagSlugs.length > 0 && (
            <button
              type="button"
              onClick={() => update({ tags: null })}
              className="ml-2 text-white/60 hover:text-white"
            >
              (clear)
            </button>
          )}
        </div>
        {allCategories.map((c) => {
          const bucket = tagsByCategory.get(c.id);
          if (!bucket || bucket.length === 0) return null;
          return (
            <div key={c.slug} className="space-y-1">
              <div className="text-[11px] uppercase text-white/40">{c.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {bucket.map((t) => {
                  const active = tagSet.has(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleTag(t.slug)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition",
                        active
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-border bg-background text-white/60 hover:border-white/30",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
