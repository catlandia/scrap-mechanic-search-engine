import type { Metadata } from "next";
import {
  getAllEntriesForAdmin,
  publishChangelogEntry,
  unpublishChangelogEntry,
  softDeleteChangelogEntry,
  restoreChangelogEntry,
  type ChangelogEntryRow,
} from "@/lib/changelog/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { isCreator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { ChangelogEditor } from "@/components/admin/ChangelogEditor";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata: Metadata = {
  title: "Changelog editor",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminChangelogPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Creator only.</div>
        <p className="mt-2 text-red-100/80">
          The changelog is authored by the Creator.
        </p>
      </div>
    );
  }

  const entries = await getAllEntriesForAdmin();
  const drafts = entries.filter((e) => !e.publishedAt && !e.deletedAt);
  const published = entries.filter((e) => e.publishedAt && !e.deletedAt);
  const deleted = entries.filter((e) => e.deletedAt);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Changelog</h1>
        <p className="text-sm text-foreground/60">
          Author updates and patch notes here. Drafts stay private until you
          publish. Publishing flips the entry public on{" "}
          <code className="rounded bg-black/40 px-1">/changelog</code> and
          bumps the top-bar &quot;What&apos;s new&quot; unread pill for every
          signed-in user.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
          New entry
        </h2>
        <ChangelogEditor mode="create" />
      </section>

      <Section title="Drafts" entries={drafts} emptyLabel="No drafts — fresh slate." />
      <Section title="Published" entries={published} emptyLabel="Nothing published yet." />
      <Section
        title="Deleted"
        entries={deleted}
        emptyLabel="Nothing soft-deleted."
      />
    </div>
  );
}

function Section({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: ChangelogEntryRow[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
        {title}{" "}
        <span className="ml-1 font-mono text-xs text-foreground/40">
          {entries.length}
        </span>
      </h2>
      {entries.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm text-foreground/60">
          {emptyLabel}
        </div>
      ) : (
        <ol className="space-y-4">
          {entries.map((e) => (
            <li key={e.id} className="space-y-3">
              <ChangelogEditor mode="edit" initial={e} />
              <div className="flex flex-wrap items-center gap-2 pl-1 text-xs">
                {!e.deletedAt && !e.publishedAt && (
                  <form action={publishChangelogEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Publishing…"
                      toastSuccess="Entry published."
                      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
                    >
                      Publish
                    </FormSubmitButton>
                  </form>
                )}
                {!e.deletedAt && e.publishedAt && (
                  <form action={unpublishChangelogEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Unpublishing…"
                      toastSuccess="Entry moved back to draft."
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                    >
                      Unpublish
                    </FormSubmitButton>
                  </form>
                )}
                {!e.deletedAt && (
                  <form action={softDeleteChangelogEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Deleting…"
                      toastSuccess="Entry soft-deleted."
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/20"
                    >
                      Soft delete
                    </FormSubmitButton>
                  </form>
                )}
                {e.deletedAt && (
                  <form action={restoreChangelogEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Restoring…"
                      toastSuccess="Entry restored."
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Restore
                    </FormSubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
