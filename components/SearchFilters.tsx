"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
  const excludeSlugs = useMemo(() => {
    const raw = searchParams.get("exclude") ?? "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);
  const tagSet = useMemo(() => new Set(tagSlugs), [tagSlugs]);
  const excludeSet = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

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

  // Tag tri-state:
  //   neutral → click → included  → click → neutral
  //   neutral → dblclick → excluded → dblclick → neutral
  //   included → dblclick → excluded (switch)
  //   excluded → click → included   (switch)
  // A tag never exists in both sets at once.
  function cycleTag(slug: string, to: "include" | "exclude") {
    const nextInclude = new Set(tagSlugs);
    const nextExclude = new Set(excludeSlugs);
    nextInclude.delete(slug);
    nextExclude.delete(slug);
    if (to === "include" && !tagSet.has(slug)) nextInclude.add(slug);
    else if (to === "exclude" && !excludeSet.has(slug)) nextExclude.add(slug);
    update({
      tags: nextInclude.size > 0 ? Array.from(nextInclude).join(",") : null,
      exclude:
        nextExclude.size > 0 ? Array.from(nextExclude).join(",") : null,
    });
  }

  const [tagFilter, setTagFilter] = useState("");

  const tagMatches = (t: Tag) => {
    if (!tagFilter.trim()) return true;
    const q = tagFilter.trim().toLowerCase();
    return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
  };

  const tagsByCategory = new Map<number | null, Tag[]>();
  for (const t of allTags) {
    if (!tagMatches(t)) continue;
    const key = t.categoryId ?? null;
    const bucket = tagsByCategory.get(key) ?? [];
    bucket.push(t);
    tagsByCategory.set(key, bucket);
  }

  return (
    <aside className="space-y-5 rounded-lg border border-border bg-card/60 p-4 text-sm">
      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-widest text-foreground/50">Search</label>
        <form
          role="search"
          aria-label="Search creations"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            update({ q: typeof value === "string" ? value : null });
          }}
        >
          <input
            name="q"
            defaultValue={q}
            aria-label="Search query"
            placeholder="e.g. sports car"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </form>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-foreground/50">Kind</div>
        <div className="flex flex-wrap gap-1.5">
          {KIND_OPTIONS.map((k) => (
            <button
              type="button"
              key={k.value || "all"}
              onClick={() => update({ kind: k.value || null })}
              aria-pressed={kind === k.value}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                kind === k.value
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-background text-foreground/60 hover:border-foreground/30",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-foreground/50">Category</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => update({ category: null })}
            aria-pressed={!categorySlug}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition",
              !categorySlug
                ? "border-accent bg-accent/20 text-accent"
                : "border-border bg-background text-foreground/60 hover:border-foreground/30",
            )}
          >
            All
          </button>
          {allCategories.map((c) => (
            <button
              type="button"
              key={c.slug}
              onClick={() => update({ category: c.slug })}
              aria-pressed={categorySlug === c.slug}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                categorySlug === c.slug
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-background text-foreground/60 hover:border-foreground/30",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-foreground/50">
            Tags
          </div>
          {(tagSlugs.length > 0 || excludeSlugs.length > 0) && (
            <button
              type="button"
              onClick={() => update({ tags: null, exclude: null })}
              className="text-[11px] text-foreground/60 hover:text-foreground"
            >
              clear selection
            </button>
          )}
        </div>
        <p className="text-[11px] text-foreground/45">
          <span className="text-foreground/65">Click</span> to include,{" "}
          <span className="text-foreground/65">double-click</span> to exclude.
          Mix them — e.g. <em>car</em> but not <em>mod</em>.
        </p>
        <input
          type="text"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Filter tags"
          placeholder="Filter tags…"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none"
        />
        {allCategories.map((c) => {
          const bucket = tagsByCategory.get(c.id);
          if (!bucket || bucket.length === 0) return null;
          return (
            <div key={c.slug} className="space-y-1">
              <div className="text-[11px] uppercase text-foreground/40">{c.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {bucket.map((t) => {
                  const included = tagSet.has(t.slug);
                  const excluded = excludeSet.has(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => cycleTag(t.slug, "include")}
                      onDoubleClick={() => cycleTag(t.slug, "exclude")}
                      aria-pressed={included}
                      aria-label={
                        excluded
                          ? `${t.name} (excluded — click to include, double-click to clear)`
                          : included
                            ? `${t.name} (included — click to clear, double-click to exclude)`
                            : `${t.name} (click to include, double-click to exclude)`
                      }
                      title={
                        excluded
                          ? "Excluded. Click to include, double-click to clear."
                          : included
                            ? "Included. Click to clear, double-click to exclude."
                            : "Click to include, double-click to exclude."
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition select-none",
                        included &&
                          "border-accent bg-accent/20 text-accent",
                        excluded &&
                          "border-red-500/60 bg-red-500/15 text-red-300 line-through decoration-red-400/60",
                        !included &&
                          !excluded &&
                          "border-border bg-background text-foreground/60 hover:border-foreground/30",
                      )}
                    >
                      {excluded && (
                        <span aria-hidden className="mr-0.5 font-mono">
                          ¬
                        </span>
                      )}
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
