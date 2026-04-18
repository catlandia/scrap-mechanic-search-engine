import { getCurrentUser } from "@/lib/auth/session";
import {
  getApprovedSuggestions,
  getPendingSuggestions,
  setSuggestionStatus,
  type SuggestionRow,
} from "@/lib/suggestions/actions";
import { isCreator } from "@/lib/auth/roles";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { UserRole } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminSuggestionsPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Creator only.</div>
        <p className="mt-2 text-red-100/80">
          The suggestion inbox is private to the Creator.
        </p>
      </div>
    );
  }

  const [inbox, live] = await Promise.all([
    getPendingSuggestions(),
    getApprovedSuggestions(viewer!.steamid),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Suggestion inbox</h1>
          <p className="text-sm text-white/60">
            New private submissions. Approve to put one on the public board,
            or reject to dismiss. Creator note is shown publicly with the
            card.
          </p>
        </header>

        {inbox.length === 0 ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
            Inbox empty.
          </div>
        ) : (
          <div className="space-y-3">
            {inbox.map((s) => (
              <InboxCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <header className="space-y-1 border-t border-border pt-6">
          <h2 className="text-xl font-semibold">Live board</h2>
          <p className="text-sm text-white/60">
            Currently approved on the public ideas page. You can mark them
            implemented once you ship, or reject them after the fact (e.g.
            they stalled on votes).
          </p>
        </header>

        {live.length === 0 ? (
          <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm text-white/60">
            No approved suggestions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {live.map((s) => (
              <LiveCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InboxCard({ suggestion }: { suggestion: SuggestionRow }) {
  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{suggestion.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            {suggestion.submitterName && suggestion.submitterSteamid ? (
              <>
                <span>from</span>
                <UserName
                  name={suggestion.submitterName}
                  role={suggestion.submitterRole as UserRole | null}
                  steamid={suggestion.submitterSteamid}
                />
                <RoleBadge role={suggestion.submitterRole as UserRole | null} />
              </>
            ) : (
              <span>anonymous</span>
            )}
            <span>·</span>
            <span>{new Date(suggestion.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {suggestion.body && (
        <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-white/80">
          {suggestion.body}
        </p>
      )}

      <form action={setSuggestionStatus} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <input
          name="note"
          type="text"
          placeholder="Creator note (optional, shown publicly)"
          className="min-w-[20ch] flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          name="status"
          value="approved"
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400"
        >
          Approve
        </button>
        <button
          type="submit"
          name="status"
          value="rejected"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/20"
        >
          Reject
        </button>
      </form>
    </article>
  );
}

function LiveCard({ suggestion }: { suggestion: SuggestionRow }) {
  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{suggestion.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            {suggestion.submitterName && suggestion.submitterSteamid ? (
              <>
                <span>from</span>
                <UserName
                  name={suggestion.submitterName}
                  role={suggestion.submitterRole as UserRole | null}
                  steamid={suggestion.submitterSteamid}
                />
                <RoleBadge role={suggestion.submitterRole as UserRole | null} />
              </>
            ) : (
              <span>anonymous</span>
            )}
            <span>·</span>
            <span>
              {suggestion.voteCount > 0
                ? `+${suggestion.voteCount}`
                : suggestion.voteCount}
              {" "}net · {suggestion.upCount}↑ / {suggestion.downCount}↓
            </span>
            {suggestion.approvedAt && (
              <>
                <span>·</span>
                <span>
                  approved {new Date(suggestion.approvedAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {suggestion.body && (
        <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-white/80">
          {suggestion.body}
        </p>
      )}

      {suggestion.creatorNote && (
        <div className="rounded border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
          <span className="font-medium">Current note:</span> {suggestion.creatorNote}
        </div>
      )}

      <form action={setSuggestionStatus} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <input
          name="note"
          type="text"
          defaultValue={suggestion.creatorNote ?? ""}
          placeholder="Update creator note (optional)"
          className="min-w-[20ch] flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          name="status"
          value="implemented"
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400"
        >
          Mark implemented
        </button>
        <button
          type="submit"
          name="status"
          value="rejected"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/20"
        >
          Reject now
        </button>
      </form>
    </article>
  );
}
