import Link from "next/link";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { SuggestionForm } from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export default async function NewSuggestionPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/suggestions"
          className="text-sm text-white/60 hover:text-accent"
        >
          ← Ideas board
        </Link>
        <h1 className="text-3xl font-bold">Suggest a feature</h1>
        <p className="text-sm text-white/60">
          Suggestions go privately to the Creator first. Approved ones land on
          the public board where everyone can upvote.
        </p>
      </header>

      {!user ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm">
          <div className="text-white/80">
            Sign in to submit a suggestion.
          </div>
          <Link
            href="/auth/steam/login?next=/suggestions/new"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Sign in with Steam
          </Link>
        </div>
      ) : isBanned(user) ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Your account is banned — suggestions are disabled.
        </div>
      ) : isMuted(user) ? (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          You&apos;re muted — suggestions are disabled.
        </div>
      ) : (
        <SuggestionForm />
      )}
    </div>
  );
}
