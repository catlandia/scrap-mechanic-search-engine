import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublishedEntries,
  markChangelogRead,
  type ChangelogEntryRow,
} from "@/lib/changelog/actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Updates and patch notes for the Scrap Mechanic Search Engine — what's new, what's fixed.",
  alternates: { canonical: "/changelog" },
};

type Tab = "all" | "update" | "patch";

function coerceTab(raw: string | undefined): Tab {
  if (raw === "update" || raw === "patch") return raw;
  return "all";
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = coerceTab(sp.tab);

  const [entries] = await Promise.all([
    getPublishedEntries(),
    // Fire-and-forget: visiting the page counts as seeing everything
    // currently published. Takes effect on the next render / nav.
    markChangelogRead(),
  ]);

  const filtered =
    tab === "all" ? entries : entries.filter((e) => e.tier === tab);
  const updateCount = entries.filter((e) => e.tier === "update").length;
  const patchCount = entries.filter((e) => e.tier === "patch").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          Changelog
        </p>
        <h1 className="text-3xl font-bold">What&apos;s new</h1>
        <p className="text-sm text-foreground/60">
          Big stuff lands under <strong className="text-foreground">Updates</strong>.
          Small fixes and polish go under{" "}
          <strong className="text-foreground">Patch notes</strong>. The newest
          entries are always on top.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border text-sm">
        <TabLink label="All" count={entries.length} active={tab === "all"} href="/changelog" />
        <TabLink
          label="Updates"
          count={updateCount}
          active={tab === "update"}
          href="/changelog?tab=update"
        />
        <TabLink
          label="Patch notes"
          count={patchCount}
          active={tab === "patch"}
          href="/changelog?tab=patch"
        />
      </nav>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
          {tab === "patch"
            ? "No patch notes yet."
            : tab === "update"
              ? "No updates yet."
              : "Nothing here yet — check back soon."}
        </div>
      ) : (
        <ol className="space-y-5">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TabLink({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 font-medium transition",
        active
          ? "border-accent text-accent"
          : "border-transparent text-foreground/60 hover:text-foreground",
      )}
    >
      {label}{" "}
      <span className="ml-1 font-mono text-xs text-foreground/40">{count}</span>
    </Link>
  );
}

function EntryCard({ entry }: { entry: ChangelogEntryRow }) {
  const tierStyle =
    entry.tier === "update"
      ? "border-accent/40 bg-accent/5"
      : "border-foreground/15 bg-card/50";
  const pillStyle =
    entry.tier === "update"
      ? "border-accent/40 bg-accent/15 text-accent"
      : "border-foreground/20 bg-foreground/10 text-foreground/70";
  const published = entry.publishedAt
    ? new Date(entry.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  return (
    <li
      id={`entry-${entry.id}`}
      className={cn("scroll-mt-20 space-y-3 rounded-lg border px-5 py-4", tierStyle)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                pillStyle,
              )}
            >
              {entry.tier === "update" ? "Update" : "Patch"}
            </span>
            {published && (
              <time className="text-xs text-foreground/50" dateTime={entry.publishedAt?.toISOString?.()}>
                {published}
              </time>
            )}
          </div>
          <h2 className="text-xl font-semibold text-foreground">{entry.title}</h2>
        </div>
      </header>
      {entry.body && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
          {entry.body}
        </div>
      )}
    </li>
  );
}
