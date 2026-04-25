import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllReviewsForAdmin,
  publishGameReview,
  unpublishGameReview,
  softDeleteGameReview,
  restoreGameReview,
  type GameReviewRow,
} from "@/lib/reviews/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { isCreator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { ReviewEditor } from "@/components/admin/ReviewEditor";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata: Metadata = {
  title: "Reviews editor",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Creator only.</div>
        <p className="mt-2 text-red-100/80">
          Game reviews are authored by the Creator.
        </p>
      </div>
    );
  }

  const entries = await getAllReviewsForAdmin();
  const drafts = entries.filter((e) => !e.publishedAt && !e.deletedAt);
  const published = entries.filter((e) => e.publishedAt && !e.deletedAt);
  const deleted = entries.filter((e) => e.deletedAt);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Game reviews</h1>
        <p className="text-sm text-foreground/60">
          Author sandbox-game reviews here. Drafts stay private until published;
          published entries appear on{" "}
          <Link href="/reviews" className="text-accent hover:underline">
            /reviews
          </Link>{" "}
          newest-first.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
          New review
        </h2>
        <ReviewEditor mode="create" />
      </section>

      <Section title="Drafts" entries={drafts} emptyLabel="No drafts." />
      <Section title="Published" entries={published} emptyLabel="Nothing published yet." />
      <Section title="Deleted" entries={deleted} emptyLabel="Nothing soft-deleted." />
    </div>
  );
}

function Section({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: GameReviewRow[];
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
              <ReviewEditor mode="edit" initial={e} />
              <div className="flex flex-wrap items-center gap-2 pl-1 text-xs">
                {!e.deletedAt && (
                  <Link
                    href={`/reviews/${e.slug}`}
                    target="_blank"
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground/70 hover:text-foreground"
                  >
                    View ↗
                  </Link>
                )}
                {!e.deletedAt && !e.publishedAt && (
                  <form action={publishGameReview}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Publishing…"
                      toastSuccess="Review published."
                      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
                    >
                      Publish
                    </FormSubmitButton>
                  </form>
                )}
                {!e.deletedAt && e.publishedAt && (
                  <form action={unpublishGameReview}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Unpublishing…"
                      toastSuccess="Review moved back to draft."
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                    >
                      Unpublish
                    </FormSubmitButton>
                  </form>
                )}
                {!e.deletedAt && (
                  <form action={softDeleteGameReview}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Deleting…"
                      toastSuccess="Review soft-deleted."
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/20"
                    >
                      Soft delete
                    </FormSubmitButton>
                  </form>
                )}
                {e.deletedAt && (
                  <form action={restoreGameReview}>
                    <input type="hidden" name="id" value={e.id} />
                    <FormSubmitButton
                      pendingLabel="Restoring…"
                      toastSuccess="Review restored."
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
