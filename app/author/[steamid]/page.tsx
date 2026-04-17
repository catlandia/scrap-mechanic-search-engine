import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CreationGrid } from "@/components/CreationCard";
import { getAuthorCreations, getAuthorProfile } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Params = Promise<{ steamid: string }>;
type SearchParams = Promise<{ page?: string }>;

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
  const pageIndex = Math.max(0, Number(sp.page ?? "1") - 1);

  const [profile, items] = await Promise.all([
    getAuthorProfile(steamid),
    getAuthorCreations(steamid, PAGE_SIZE + 1, pageIndex * PAGE_SIZE),
  ]);

  if (!profile) notFound();

  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">Author</p>
        <h1 className="text-3xl font-bold">{profile.authorName ?? "Unknown author"}</h1>
        <p className="text-sm text-white/60">
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
      </header>

      <CreationGrid items={displayed} />

      <nav className="flex items-center justify-between pt-2 text-sm text-white/60">
        {pageIndex > 0 ? (
          <Link
            href={`/author/${steamid}?page=${pageIndex}`}
            className="rounded border border-border px-3 py-1 hover:text-white"
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
