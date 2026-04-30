import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreationCard, CreationGrid } from "@/components/CreationCard";
import { SortSelector } from "@/components/SortSelector";
import {
  getAuthorCreations,
  getAuthorProfile,
  parsePageIndex,
  parseSortMode,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Params = Promise<{ steamid: string }>;
type SearchParams = Promise<{ sort?: string; page?: string }>;

function isValidSteamId(s: string) {
  return /^\d{1,25}$/.test(s);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { steamid } = await params;
  if (!isValidSteamId(steamid)) return {};
  const profile = await getAuthorProfile(steamid);
  if (!profile) return {};
  return {
    title: `${profile.authorName ?? "Unknown author"}`,
    description: `${profile.count} approved Scrap Mechanic Workshop creation${profile.count === 1 ? "" : "s"} from ${profile.authorName ?? "this author"}.`,
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { steamid } = await params;
  if (!isValidSteamId(steamid)) notFound();

  const sp = await searchParams;
  const sort = parseSortMode(sp.sort);
  const pageIndex = parsePageIndex(sp.page);

  const [profile, items] = await Promise.all([
    getAuthorProfile(steamid),
    getAuthorCreations(steamid, {
      sort,
      limit: PAGE_SIZE + 1,
      offset: pageIndex * PAGE_SIZE,
    }),
  ]);

  if (!profile) notFound();

  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);
  const ratingMode = await getRatingMode();
  const { t } = await getT();

  // Sort kind breakdown by count descending so the most prolific kind
  // anchors the strip. Ties fall back to alphabetic for stable rendering.
  const kindEntries = Object.entries(profile.kindCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const KIND_KEY: Record<string, string> = {
    blueprint: "kind.blueprints",
    mod: "kind.mods",
    world: "kind.worlds",
    challenge: "kind.challenges",
    tile: "kind.tiles",
    custom_game: "kind.customGames",
    terrain_asset: "kind.terrain",
    other: "kind.other",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-widest text-accent">Author</p>
          <h1 className="text-3xl font-bold">{profile.authorName ?? "Unknown author"}</h1>
          <p className="text-sm text-foreground/60">
            {profile.count} approved creation{profile.count === 1 ? "" : "s"} on the site ·{" "}
            <a
              href={`https://steamcommunity.com/profiles/${steamid}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Steam profile ↗
            </a>{" "}
            ·{" "}
            <Link
              href={`/feed.xml?author=${steamid}`}
              prefetch={false}
              className="text-accent hover:underline"
            >
              RSS ↗
            </Link>
          </p>
        </div>
        <Suspense>
          <SortSelector current={sort} />
        </Suspense>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card/60 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-foreground/40">
            {t("author.totalCreations")}
          </div>
          <div className="mt-0.5 text-2xl font-semibold">
            {profile.count.toLocaleString()}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card/60 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-foreground/40">
            {t("author.totalSubs")}
          </div>
          <div className="mt-0.5 text-2xl font-semibold">
            {profile.totalSubs.toLocaleString()}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card/60 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-foreground/40">
            {t("author.kindBreakdown")}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {kindEntries.map(([kind, n]) => (
              <span
                key={kind}
                className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-foreground/5 px-2 py-0.5 text-xs"
              >
                <span className="font-mono text-foreground/60">{n}</span>
                <span className="text-foreground/80">
                  {t(KIND_KEY[kind] ?? "kind.other")}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {profile.topCreation && pageIndex === 0 && (
        <section className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-foreground/40">
            {t("author.topCreation")}
          </div>
          <div className="max-w-sm">
            <CreationCard
              creation={profile.topCreation}
              ratingMode={ratingMode}
            />
          </div>
        </section>
      )}

      <CreationGrid items={displayed} ratingMode={ratingMode} />

      <nav className="flex items-center justify-between pt-2 text-sm text-foreground/60">
        {pageIndex > 0 ? (
          <Link
            href={`/author/${steamid}?page=${pageIndex}`}
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
            href={`/author/${steamid}?page=${pageIndex + 2}`}
            className="rounded border border-border px-3 py-1 hover:text-foreground"
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
