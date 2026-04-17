import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CreationGrid } from "@/components/CreationCard";
import { SortSelector } from "@/components/SortSelector";
import { getApprovedByKind, parseSortMode } from "@/lib/db/queries";
import type { CreationKind } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

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
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_KIND).map((slug) => ({ kind: slug }));
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
  const pageIndex = Math.max(0, Number(sp.page ?? "1") - 1);
  const items = await getApprovedByKind(entry.kind, {
    sort,
    limit: PAGE_SIZE + 1,
    offset: pageIndex * PAGE_SIZE,
  });
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
          <p className="text-sm text-white/60">{entry.description}</p>
        </div>
        <Suspense>
          <SortSelector current={sort} />
        </Suspense>
      </header>

      <CreationGrid items={displayed} />

      <nav className="flex items-center justify-between pt-4 text-sm text-white/60">
        {pageIndex > 0 ? (
          <Link href={qs({ page: pageIndex })} className="rounded border border-border px-3 py-1 hover:text-white">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        <span>Page {pageIndex + 1}</span>
        {hasNext ? (
          <Link
            href={qs({ page: pageIndex + 2 })}
            className="rounded border border-border px-3 py-1 hover:text-white"
          >
            Older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
