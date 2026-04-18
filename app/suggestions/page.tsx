import Link from "next/link";
import {
  getApprovedSuggestions,
  getRejectedSuggestions,
} from "@/lib/suggestions/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { SuggestionCard } from "@/components/SuggestionCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab: "approved" | "rejected" =
    sp.status === "rejected" ? "rejected" : "approved";

  const viewer = await getCurrentUser();
  const suggestions =
    tab === "rejected"
      ? await getRejectedSuggestions(viewer?.steamid ?? null)
      : await getApprovedSuggestions(viewer?.steamid ?? null);

  const [approvedCount, rejectedCount] = await Promise.all([
    tab === "approved"
      ? Promise.resolve(suggestions.length)
      : getApprovedSuggestions(null).then((r) => r.length),
    tab === "rejected"
      ? Promise.resolve(suggestions.length)
      : getRejectedSuggestions(null).then((r) => r.length),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent">
            Feature suggestions
          </p>
          <h1 className="text-3xl font-bold">Ideas board</h1>
          <p className="text-sm text-white/60">
            Suggestions reviewed by the Creator. Upvote what you want
            prioritised; most-upvoted rise to the top.
          </p>
        </div>
        <Link
          href="/suggestions/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Submit a suggestion
        </Link>
      </header>

      <nav className="flex gap-2 border-b border-border text-sm">
        <TabLink label="Approved" count={approvedCount} active={tab === "approved"} href="/suggestions" />
        <TabLink
          label="Rejected"
          count={rejectedCount}
          active={tab === "rejected"}
          href="/suggestions?status=rejected"
        />
      </nav>

      {suggestions.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-white/60">
          {tab === "rejected"
            ? "No rejected suggestions — the Creator hasn't said no to anything yet."
            : "No public suggestions yet. Be first — submit one and the Creator will review it."}
        </div>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={s.id}>
              <SuggestionCard
                suggestion={s}
                signedIn={!!viewer}
                readOnly={tab === "rejected"}
              />
            </li>
          ))}
        </ul>
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
          : "border-transparent text-white/60 hover:text-white",
      )}
    >
      {label}{" "}
      <span className="ml-1 text-xs font-mono text-white/40">{count}</span>
    </Link>
  );
}
