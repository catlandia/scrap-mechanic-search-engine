import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreationGrid } from "@/components/CreationCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SortSelector } from "@/components/SortSelector";
import {
  getAllCategories,
  getAllTags,
  parsePageIndex,
  parseSortMode,
  searchApproved,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Scrap Mechanic Search Engine",
  description:
    "Search and filter Scrap Mechanic Steam Workshop creations by kind, category, and tags — find drivable campers, mech walkers, custom worlds, and more.",
  alternates: { canonical: "/search" },
};

const PAGE_SIZE = 24;

type SearchParamsType = Promise<{
  kind?: string;
  category?: string;
  tags?: string;
  exclude?: string;
  q?: string;
  sort?: string;
  page?: string;
}>;

function splitCsv(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParamsType }) {
  const sp = await searchParams;
  const tagSlugs = splitCsv(sp.tags);
  // A tag that appears in both `tags` and `exclude` (shouldn't happen from
  // the UI since the two are mutually exclusive there, but a hand-crafted
  // URL could) is treated as an exclude — silently drop from includes.
  const excludeSet = new Set(splitCsv(sp.exclude));
  const includeTagSlugs = tagSlugs.filter((t) => !excludeSet.has(t));
  const excludeTagSlugs = Array.from(excludeSet);

  const hasQuery = Boolean(sp.q?.trim());
  const defaultSort = hasQuery ? "relevance" : "newest";
  const sort = sp.sort ? parseSortMode(sp.sort) : defaultSort;
  const pageIndex = parsePageIndex(sp.page, 200);

  const [allTags, allCategories, results] = await Promise.all([
    getAllTags(),
    getAllCategories(),
    searchApproved(
      {
        kind: sp.kind,
        categorySlug: sp.category,
        tagSlugs: includeTagSlugs,
        excludeTagSlugs,
        q: sp.q,
        sort,
      },
      pageIndex,
      PAGE_SIZE,
    ),
  ]);

  const totalPages = Math.ceil(results.total / PAGE_SIZE);
  const ratingMode = await getRatingMode();

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (sp.kind) params.set("kind", sp.kind);
    if (sp.category) params.set("category", sp.category);
    if (sp.q) params.set("q", sp.q);
    if (includeTagSlugs.length > 0) params.set("tags", includeTagSlugs.join(","));
    if (excludeTagSlugs.length > 0) params.set("exclude", excludeTagSlugs.join(","));
    if (sort !== defaultSort) params.set("sort", sort);
    if (targetPage > 0) params.set("page", String(targetPage + 1));
    const s = params.toString();
    return s ? `/search?${s}` : "/search";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      <Suspense>
        <SearchFilters allTags={allTags} allCategories={allCategories} />
      </Suspense>

      <section className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">Search</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-foreground/50">
              {results.total} result{results.total === 1 ? "" : "s"}
            </p>
            <Suspense>
              <SortSelector current={sort} />
            </Suspense>
          </div>
        </header>

        <CreationGrid items={results.items} ratingMode={ratingMode} />

        {totalPages > 1 && (
          <nav className="flex items-center justify-between pt-2 text-sm text-foreground/60">
            {pageIndex > 0 ? (
              <Link
                href={pageHref(pageIndex - 1)}
                className="rounded border border-border px-3 py-1 hover:text-foreground"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {pageIndex + 1} of {totalPages}
            </span>
            {pageIndex + 1 < totalPages ? (
              <Link
                href={pageHref(pageIndex + 1)}
                className="rounded border border-border px-3 py-1 hover:text-foreground"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
