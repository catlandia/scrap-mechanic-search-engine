import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CreationGrid } from "@/components/CreationCard";
import { SortSelector } from "@/components/SortSelector";
import {
  getApprovedByKind,
  getTopTagsForKind,
  parsePageIndex,
  parseSortMode,
} from "@/lib/db/queries";
import type { CreationKind } from "@/lib/db/schema";
import { getRatingMode } from "@/lib/prefs.server";

export const dynamic = "force-dynamic";
// Reject unknown slugs with a real 404 instead of rendering the not-found
// page at status 200. Only slugs enumerated in generateStaticParams() below
// are accepted; anything else gets the framework 404 response code.
export const dynamicParams = false;

const SLUG_TO_KIND: Record<string, { kind: CreationKind; label: string; description: string }> = {
  blueprints: {
    kind: "blueprint",
    label: "Blueprints",
    description: "Drivable machines, buildings, and contraptions.",
  },
  mods: { kind: "mod", label: "Mods", description: "Gameplay and content mods." },
  worlds: { kind: "world", label: "Worlds", description: "Custom maps and survival worlds." },
  challenges: {
    kind: "challenge",
    label: "Challenges",
    description: "Community-authored challenge packs.",
  },
  tiles: { kind: "tile", label: "Tiles", description: "Custom terrain tiles." },
  "custom-games": {
    kind: "custom_game",
    label: "Custom Games",
    description: "Player-created game modes.",
  },
  terrain: { kind: "terrain_asset", label: "Terrain Assets", description: "Reusable terrain assets." },
  other: {
    kind: "other",
    label: "Other",
    description: "Workshop items that don't fit any other kind.",
  },
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_KIND).map((slug) => ({ kind: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind: slug } = await params;
  const entry = SLUG_TO_KIND[slug];
  if (!entry) return {};
  return {
    title: `${entry.label} — Scrap Mechanic Search Engine`,
    description: entry.description,
    alternates: { canonical: `/${slug}` },
  };
}

const PAGE_SIZE = 24;

type Params = Promise<{ kind: string }>;
type SearchParams = Promise<{ sort?: string; page?: string }>;

export default async function KindPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { kind: slug } = await params;
  const entry = SLUG_TO_KIND[slug];
  if (!entry) notFound();

  const sp = await searchParams;
  const sort = parseSortMode(sp.sort);
  const pageIndex = parsePageIndex(sp.page);
  const [items, topTags, ratingMode] = await Promise.all([
    getApprovedByKind(entry.kind, {
      sort,
      limit: PAGE_SIZE + 1,
      offset: pageIndex * PAGE_SIZE,
    }),
    getTopTagsForKind(entry.kind, 20),
    getRatingMode(),
  ]);
  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);

  const basePath = `/${slug}`;
  const qs = (extra: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    if (sort !== "newest") params.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{entry.label}</h1>
          <p className="text-sm text-foreground/60">{entry.description}</p>
        </div>
        <Suspense>
          <SortSelector current={sort} />
        </Suspense>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
        <div className="min-w-0 space-y-4">
          <CreationGrid items={displayed} ratingMode={ratingMode} />

          <nav className="flex items-center justify-between pt-4 text-sm text-foreground/60">
            {pageIndex > 0 ? (
              <Link
                href={qs({ page: pageIndex })}
                className="rounded border border-border px-3 py-1 hover:text-foreground"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span>Page {pageIndex + 1}</span>
            {hasNext ? (
              <Link
                href={qs({ page: pageIndex + 2 })}
                className="rounded border border-border px-3 py-1 hover:text-foreground"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <TagSidebar kind={entry.kind} tags={topTags} />
      </div>
    </div>
  );
}

function TagSidebar({
  kind,
  tags,
}: {
  kind: CreationKind;
  tags: Array<{ id: number; slug: string; name: string; count: number }>;
}) {
  if (tags.length === 0) return null;
  return (
    <aside className="md:sticky md:top-20 md:self-start">
      <div className="mb-2 text-[10px] uppercase tracking-widest text-foreground/40">
        Filter by tag
      </div>
      <ul className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
        {tags.map((t) => (
          <li key={t.id}>
            <Link
              href={`/search?kind=${kind}&tags=${t.slug}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1 text-xs text-foreground/75 transition hover:border-accent/60 hover:text-accent"
            >
              <span className="truncate">{t.name}</span>
              <span className="shrink-0 tabular-nums text-foreground/35">
                {t.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
