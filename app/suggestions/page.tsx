import Link from "next/link";
import { getApprovedSuggestions } from "@/lib/suggestions/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { SuggestionCard } from "@/components/SuggestionCard";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const viewer = await getCurrentUser();
  const suggestions = await getApprovedSuggestions(viewer?.steamid ?? null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent">
            Feature suggestions
          </p>
          <h1 className="text-3xl font-bold">Ideas board</h1>
          <p className="text-sm text-white/60">
            Suggestions approved by the Creator. Upvote the ones you want
            prioritised — most-upvoted rise to the top.
          </p>
        </div>
        <Link
          href="/suggestions/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Submit a suggestion
        </Link>
      </header>

      {suggestions.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-white/60">
          No public suggestions yet. Be first — submit one and the Creator
          will review it.
        </div>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={s.id}>
              <SuggestionCard suggestion={s} signedIn={!!viewer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
