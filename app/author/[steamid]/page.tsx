import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreationGrid } from "@/components/CreationCard";
import { SortSelector } from "@/components/SortSelector";
import {
  getAuthorCreations,
  getAuthorProfile,
  parseSortMode,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";

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
  const pageIndex = Math.max(0, Number(sp.page ?? "1") - 1);

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
            </a>
          </p>
        </div>
        <Suspense>
          <SortSelector current={sort} />
        </Suspense>
      </header>

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
