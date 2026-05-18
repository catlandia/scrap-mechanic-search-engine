import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getApprovalsByMonth,
  getApprovedKindCounts,
  getCatalogueTotals,
  getMostFavouritedCreations,
  getMostSubscribedCreations,
  getTopTagsOverall,
  getUserCounts,
  type CreationCardRow,
} from "@/lib/db/queries";
import { CREATION_KINDS, type CreationKind } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Stats — Scrap Mechanic Search Engine",
  description:
    "Catalogue size, growth over time, top tags, and most-subscribed creations on the Scrap Mechanic Search Engine.",
  alternates: { canonical: "/stats" },
};

// English-only first cut. Same convention as /guide and /admin/*. A
// translation pass can layer on later through `lib/i18n/dictionaries.ts`
// without changing the page structure.
const KIND_LABEL: Record<CreationKind, string> = {
  blueprint: "Blueprints",
  mod: "Mods",
  world: "Worlds",
  challenge: "Challenges",
  tile: "Tiles",
  custom_game: "Custom Games",
  terrain_asset: "Terrain Assets",
  other: "Other",
};

const KIND_HREF: Record<CreationKind, string> = {
  blueprint: "/blueprints",
  mod: "/mods",
  world: "/worlds",
  challenge: "/challenges",
  tile: "/tiles",
  custom_game: "/custom-games",
  terrain_asset: "/terrain",
  other: "/search?kind=other",
};

function formatMonthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export default async function StatsPage() {
  const [totals, users, kindCounts, monthly, topTags, topSubs, topSiteFavs] =
    await Promise.all([
      getCatalogueTotals(),
      getUserCounts(),
      getApprovedKindCounts(),
      getApprovalsByMonth(12),
      getTopTagsOverall(10),
      getMostSubscribedCreations(5),
      getMostFavouritedCreations(5),
    ]);

  const maxKindCount = Math.max(
    1,
    ...(CREATION_KINDS as readonly string[]).map((k) => kindCounts[k] ?? 0),
  );
  const maxMonthCount = Math.max(1, ...monthly.map((m) => m.count));

  return (
    <article className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">Stats</p>
        <h1 className="text-3xl font-bold">Site by the numbers</h1>
        <p className="text-sm text-foreground/70">
          Public snapshot of the catalogue and community, refreshed at most
          once an hour.
        </p>
      </header>

      <section aria-labelledby="totals" className="space-y-4">
        <h2 id="totals" className="sr-only">
          Top-line totals
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Approved creations"
            value={totals.approvedCreations.toLocaleString()}
          />
          <StatTile
            label="Steam subscriptions"
            value={formatCompact(totals.totalSubscriptions)}
            sub={`${totals.totalSubscriptions.toLocaleString()} total`}
          />
          <StatTile
            label="Signed-in users"
            value={users.total.toLocaleString()}
          />
          <StatTile
            label="Online now"
            value={users.online.toLocaleString()}
            sub="last 5 min"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Credited authors"
            value={totals.uniqueAuthors.toLocaleString()}
            sub="primary uploader only"
          />
          <StatTile
            label="Site favourites"
            value={totals.totalSiteFavorites.toLocaleString()}
          />
          <StatTile
            label="Comments posted"
            value={totals.totalComments.toLocaleString()}
            sub="excluding deleted"
          />
          <StatTile
            label="Creation votes cast"
            value={totals.totalCreationVotes.toLocaleString()}
          />
        </div>
      </section>

      <section aria-labelledby="by-kind" className="space-y-4">
        <h2 id="by-kind" className="text-xl font-semibold">
          By kind
        </h2>
        <ul className="space-y-2">
          {(CREATION_KINDS as readonly CreationKind[]).map((kind) => {
            const count = kindCounts[kind] ?? 0;
            const pct = (count / maxKindCount) * 100;
            return (
              <li key={kind}>
                <Link
                  href={KIND_HREF[kind]}
                  className="block rounded-md border border-border bg-card/40 px-3 py-2 hover:border-accent/60"
                >
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{KIND_LABEL[kind]}</span>
                    <span className="tabular-nums text-foreground/70">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="over-time" className="space-y-4">
        <h2 id="over-time" className="text-xl font-semibold">
          Approvals over time
        </h2>
        <p className="text-xs text-foreground/60">
          Creations approved per calendar month, last {monthly.length} months.
        </p>
        <div className="rounded-md border border-border bg-card/40 p-4">
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Monthly approvals bar chart">
            {monthly.map((m) => {
              const heightPct = (m.count / maxMonthCount) * 100;
              return (
                <div
                  key={m.monthIso}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${formatMonthLabel(m.monthIso)}: ${m.count.toLocaleString()}`}
                >
                  <span className="text-[10px] tabular-nums text-foreground/60">
                    {m.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-accent/80"
                    style={{
                      height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%`,
                    }}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1">
            {monthly.map((m) => (
              <div
                key={`label-${m.monthIso}`}
                className="flex-1 text-center text-[10px] uppercase tracking-wider text-foreground/50"
              >
                {formatMonthLabel(m.monthIso)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="top-tags" className="space-y-4">
        <h2 id="top-tags" className="text-xl font-semibold">
          Top tags
        </h2>
        <p className="text-xs text-foreground/60">
          Most-used tags across the approved catalogue. Click to search.
        </p>
        <ul className="flex flex-wrap gap-2">
          {topTags.map((tag, i) => (
            <li key={tag.id}>
              <Link
                href={`/search?tags=${encodeURIComponent(tag.slug)}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-sm hover:border-accent/60"
              >
                <span className="text-foreground/40 tabular-nums">
                  #{i + 1}
                </span>
                <span className="font-medium">{tag.name}</span>
                <span className="text-foreground/60 tabular-nums">
                  {tag.count.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="top-creations" className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 id="top-creations" className="text-xl font-semibold">
            Most subscribed on Steam
          </h2>
          <RankList rows={topSubs} metric={(r) => r.subscriptions} metricLabel="subs" />
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Most favourited on the site</h2>
          {topSiteFavs.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No site favourites yet — be the first.
            </p>
          ) : (
            <RankList
              rows={topSiteFavs}
              metric={(r) => r.siteFavorites}
              metricLabel="favs"
            />
          )}
        </div>
      </section>

      <p className="text-xs text-foreground/40">
        Catalogue figures cache for an hour and refresh on the next admin
        action. Steam subscription totals reflect the last weekly refresh.
      </p>
    </article>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wider text-foreground/50">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-foreground/40">{sub}</div>
      )}
    </div>
  );
}

function RankList<T extends CreationCardRow & { siteFavorites?: number }>({
  rows,
  metric,
  metricLabel,
}: {
  rows: T[];
  metric: (r: T) => number;
  metricLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground/60">No data yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link
            href={`/creation/${r.shortId ?? r.id}`}
            className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-2 hover:border-accent/60"
          >
            <span className="w-5 text-center text-sm tabular-nums text-foreground/40">
              {i + 1}
            </span>
            {r.thumbnailUrl ? (
              <Image
                src={r.thumbnailUrl}
                alt=""
                width={56}
                height={56}
                className="size-14 flex-none rounded object-cover"
                unoptimized
              />
            ) : (
              <div
                className="size-14 flex-none rounded bg-foreground/10"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.title}</div>
              <div className="truncate text-xs text-foreground/60">
                {r.authorName ?? "Unknown author"}
              </div>
            </div>
            <div className="flex-none text-right text-sm tabular-nums">
              {metric(r).toLocaleString()}
              <span className="ml-1 text-[10px] uppercase tracking-wider text-foreground/50">
                {metricLabel}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  }
  return n.toLocaleString();
}
