import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteSuggestion,
  getApprovedSuggestions,
  getImplementedSuggestions,
  getPendingSuggestions,
  getRejectedSuggestions,
  setSuggestionStatus,
  updateSuggestionNote,
  type SuggestionRow,
} from "@/lib/suggestions/actions";
import { isCreator } from "@/lib/auth/roles";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { UserRole } from "@/lib/db/schema";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const dynamic = "force-dynamic";

type Transition = {
  label: string;
  value: "approved" | "rejected" | "implemented";
  style: string;
};

function submitterLine(s: SuggestionRow) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
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
      {s.voteCount !== 0 && (
        <>
          <span>·</span>
          <span>
            {s.voteCount > 0 ? `+${s.voteCount}` : s.voteCount} net · {s.upCount}↑ / {s.downCount}↓
          </span>
        </>
      )}
    </div>
  );
}

function ActionCard({
  suggestion,
  transitions,
}: {
  suggestion: SuggestionRow;
  transitions: Transition[];
}) {
  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-base font-semibold">{suggestion.title}</h3>
        {submitterLine(suggestion)}
      </div>

      {suggestion.body && (
        <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-foreground/80">
          {suggestion.body}
        </p>
      )}

      {suggestion.imageDataUri && (
         
        <a
          href={suggestion.imageDataUri}
          target="_blank"
          rel="noopener noreferrer"
          title="Open full size"
          className="inline-block"
        >
          <img
            src={suggestion.imageDataUri}
            alt="Attached by submitter"
            className="max-h-64 rounded border border-border"
          />
        </a>
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
          placeholder="Creator note (optional, shown publicly)"
          className="min-w-[20ch] flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <FormSubmitButton
          formAction={updateSuggestionNote}
          pendingLabel="Saving…"
          toastSuccess="Note saved."
          className="rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-200 hover:bg-purple-500/20"
          title="Save the creator note without changing the idea's status"
        >
          Save note
        </FormSubmitButton>
        {transitions.map((t) => (
          <FormSubmitButton
            key={t.value}
            name="status"
            value={t.value}
            pendingLabel={`${t.label}…`}
            toastSuccess={`${t.label}: done.`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${t.style}`}
          >
            {t.label}
          </FormSubmitButton>
        ))}
      </form>

      <form action={deleteSuggestion}>
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <FormSubmitButton
          pendingLabel="Deleting…"
          toastSuccess="Suggestion hard-deleted."
          className="text-xs text-foreground/40 hover:text-red-300"
          title="Hard delete — removes the suggestion row entirely, won't appear in any tab"
        >
          🗑 hard delete
        </FormSubmitButton>
      </form>
    </article>
  );
}

const APPROVE: Transition = {
  label: "Approve",
  value: "approved",
  style: "bg-emerald-500 text-black hover:bg-emerald-400",
};
const REJECT: Transition = {
  label: "Reject",
  value: "rejected",
  style: "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
};
const MARK_IMPL: Transition = {
  label: "Mark implemented",
  value: "implemented",
  style: "bg-emerald-500 text-black hover:bg-emerald-400",
};
const BACK_TO_APPROVED: Transition = {
  label: "Back to approved",
  value: "approved",
  style: "border border-accent/60 bg-accent/15 text-accent hover:bg-accent/25",
};

export default async function AdminSuggestionsPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Creator only.</div>
        <p className="mt-2 text-red-100/80">
          Suggestion management is private to the Creator.
        </p>
      </div>
    );
  }

  const [inbox, approved, implemented, rejected] = await Promise.all([
    getPendingSuggestions(),
    getApprovedSuggestions(viewer!.steamid),
    getImplementedSuggestions(viewer!.steamid),
    getRejectedSuggestions(viewer!.steamid),
  ]);

  return (
    <div className="space-y-10">
      <Section
        title="Inbox"
        subtitle="New private submissions. Approve to put on the public board."
        suggestions={inbox}
        transitions={[APPROVE, REJECT]}
        emptyLabel="Inbox empty."
      />
      <Section
        title="Live board"
        subtitle="Approved and open for public upvotes."
        suggestions={approved}
        transitions={[MARK_IMPL, REJECT]}
        emptyLabel="No approved suggestions yet."
      />
      <Section
        title="Implemented"
        subtitle="Shipped. Use Back to approved if you want to unmark."
        suggestions={implemented}
        transitions={[BACK_TO_APPROVED, REJECT]}
        emptyLabel="Nothing implemented yet."
      />
      <Section
        title="Rejected"
        subtitle="Visible on the public Rejected tab. Back to approved revives; hard delete removes entirely."
        suggestions={rejected}
        transitions={[BACK_TO_APPROVED]}
        emptyLabel="Nothing rejected."
      />
    </div>
  );
}

function Section({
  title,
  subtitle,
  suggestions,
  transitions,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  suggestions: SuggestionRow[];
  transitions: Transition[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-4">
      <header className="space-y-1 border-t border-border pt-6 first:border-t-0 first:pt-0">
        <h2 className="text-xl font-semibold">
          {title}{" "}
          <span className="ml-1 font-mono text-xs text-foreground/40">
            {suggestions.length}
          </span>
        </h2>
        <p className="text-sm text-foreground/60">{subtitle}</p>
      </header>
      {suggestions.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm text-foreground/60">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <ActionCard key={s.id} suggestion={s} transitions={transitions} />
          ))}
        </div>
      )}
    </section>
  );
}
