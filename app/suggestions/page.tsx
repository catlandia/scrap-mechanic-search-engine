import type { Metadata } from "next";
import Link from "next/link";
import {
  getApprovedSuggestions,
  getImplementedSuggestions,
  getRejectedSuggestions,
  type SuggestionRow,
} from "@/lib/suggestions/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { SuggestionCard } from "@/components/SuggestionCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ideas board — Scrap Mechanic Search Engine",
  description:
    "Community-submitted feature suggestions for the Scrap Mechanic Search Engine. Upvote the ideas you want first, or see what's been implemented or rejected.",
  alternates: { canonical: "/suggestions" },
};

type Tab = "approved" | "implemented" | "rejected";

type SearchParams = Promise<{ status?: string }>;

function coerceTab(raw: string | undefined): Tab {
  if (raw === "implemented") return "implemented";
  if (raw === "rejected") return "rejected";
  return "approved";
}

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = coerceTab(sp.status);

  const viewer = await getCurrentUser();
  const viewerId = viewer?.steamid ?? null;

  const [approved, implemented, rejected] = await Promise.all([
    getApprovedSuggestions(viewerId),
    getImplementedSuggestions(viewerId),
    getRejectedSuggestions(viewerId),
  ]);

  const narrowList =
    tab === "implemented"
      ? implemented
      : tab === "rejected"
        ? rejected
        : approved;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent">
            Feature suggestions
          </p>
          <h1 className="text-3xl font-bold">Ideas board</h1>
          <p className="text-sm text-foreground/60">
            Ideas the Creator has reviewed. Upvote the ones you want first.
            Rejected ideas stay visible so you can see what didn&apos;t make
            the cut and why.
          </p>
        </div>
        <Link
          href="/suggestions/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Submit a suggestion
        </Link>
      </header>

      <div className="lg:hidden">
        <nav className="flex gap-2 border-b border-border text-sm">
          <TabLink label="Approved" count={approved.length} active={tab === "approved"} href="/suggestions" />
          <TabLink
            label="Implemented"
            count={implemented.length}
            active={tab === "implemented"}
            href="/suggestions?status=implemented"
          />
          <TabLink
            label="Rejected"
            count={rejected.length}
            active={tab === "rejected"}
            href="/suggestions?status=rejected"
          />
        </nav>

        <div className="mt-6">
          <SuggestionList
            suggestions={narrowList}
            signedIn={!!viewer}
            readOnly={tab !== "approved"}
            emptyLabel={
              tab === "rejected"
                ? "No rejected ideas yet."
                : tab === "implemented"
                  ? "No implemented ideas yet. Things approved and shipped show up here."
                  : "No approved ideas on the board yet — submit one."
            }
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
        <BoardColumn
          label="Approved"
          tone="accent"
          count={approved.length}
          suggestions={approved}
          signedIn={!!viewer}
          readOnly={false}
          emptyLabel="No approved ideas on the board yet — submit one."
        />
        <BoardColumn
          label="Implemented"
          tone="emerald"
          count={implemented.length}
          suggestions={implemented}
          signedIn={!!viewer}
          readOnly
          emptyLabel="No implemented ideas yet. Things approved and shipped show up here."
        />
        <BoardColumn
          label="Rejected"
          tone="red"
          count={rejected.length}
          suggestions={rejected}
          signedIn={!!viewer}
          readOnly
          emptyLabel="No rejected ideas yet."
        />
      </div>
    </div>
  );
}

function SuggestionList({
  suggestions,
  signedIn,
  readOnly,
  emptyLabel,
}: {
  suggestions: SuggestionRow[];
  signedIn: boolean;
  readOnly: boolean;
  emptyLabel: string;
}) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {suggestions.map((s) => (
        <li key={s.id}>
          <SuggestionCard
            suggestion={s}
            signedIn={signedIn}
            readOnly={readOnly}
          />
        </li>
      ))}
    </ul>
  );
}

function BoardColumn({
  label,
  tone,
  count,
  suggestions,
  signedIn,
  readOnly,
  emptyLabel,
}: {
  label: string;
  tone: "accent" | "emerald" | "red";
  count: number;
  suggestions: SuggestionRow[];
  signedIn: boolean;
  readOnly: boolean;
  emptyLabel: string;
}) {
  const headerTone =
    tone === "accent"
      ? "border-accent/60 text-accent"
      : tone === "emerald"
        ? "border-emerald-500/50 text-emerald-300"
        : "border-red-500/50 text-red-300";
  return (
    <section className="flex flex-col gap-3">
      <header
        className={cn(
          "flex items-baseline justify-between border-b-2 pb-2",
          headerTone,
        )}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest">
          {label}
        </h2>
        <span className="font-mono text-xs text-foreground/50">{count}</span>
      </header>
      <SuggestionList
        suggestions={suggestions}
        signedIn={signedIn}
        readOnly={readOnly}
        emptyLabel={emptyLabel}
      />
    </section>
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
