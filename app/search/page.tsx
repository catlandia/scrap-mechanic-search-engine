import Link from "next/link";
import { Suspense } from "react";
import { CreationGrid } from "@/components/CreationCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SortSelector } from "@/components/SortSelector";
import {
  getAllCategories,
  getAllTags,
  parseSortMode,
  searchApproved,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParamsType = Promise<{
  kind?: string;
  category?: string;
  tags?: string;
  q?: string;
  sort?: string;
  page?: string;
}>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParamsType }) {
  const sp = await searchParams;
  const tagSlugs = (sp.tags ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sort = parseSortMode(sp.sort);
  const pageIndex = Math.max(0, Number(sp.page ?? "1") - 1);

  const [allTags, allCategories, results] = await Promise.all([
    getAllTags(),
    getAllCategories(),
    searchApproved(
      {
        kind: sp.kind,
        categorySlug: sp.category,
        tagSlugs,
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
    if (tagSlugs.length > 0) params.set("tags", tagSlugs.join(","));
    if (sort !== "newest") params.set("sort", sort);
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
            <p className="text-sm text-white/50">
              {results.total} result{results.total === 1 ? "" : "s"}
            </p>
            <Suspense>
              <SortSelector current={sort} />
            </Suspense>
          </div>
        </header>

        <CreationGrid items={results.items} ratingMode={ratingMode} />

        {totalPages > 1 && (
          <nav className="flex items-center justify-between pt-2 text-sm text-white/60">
            {pageIndex > 0 ? (
              <Link
                href={pageHref(pageIndex - 1)}
                className="rounded border border-border px-3 py-1 hover:text-white"
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
                className="rounded border border-border px-3 py-1 hover:text-white"
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
