import { getCurrentUser } from "@/lib/auth/session";
import { getPendingSuggestions, setSuggestionStatus } from "@/lib/suggestions/actions";
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

  const rows = await getPendingSuggestions();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Suggestion inbox</h1>
        <p className="text-sm text-white/60">
          Private queue of new feature suggestions. Approve to put a suggestion
          on the public <code>/suggestions</code> board where people can
          upvote; reject to dismiss. Add a creator note if you want context
          shown with the approved card.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
          Inbox empty.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <article
              key={s.id}
              className="space-y-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    {s.submitterName && s.submitterSteamid ? (
                      <>
                        <span>from</span>
                        <UserName
                          name={s.submitterName}
                          role={s.submitterRole as UserRole | null}
                          steamid={s.submitterSteamid}
                        />
                        <RoleBadge role={s.submitterRole as UserRole | null} />
                      </>
                    ) : (
                      <span>anonymous</span>
                    )}
                    <span>·</span>
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {s.body && (
                <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-white/80">
                  {s.body}
                </p>
              )}

              <form
                action={setSuggestionStatus}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="suggestionId" value={s.id} />
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
          ))}
        </div>
      )}
    </div>
  );
}
