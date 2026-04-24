import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { ingestRuns } from "@/lib/db/schema";
import { triggerIngest } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { IngestProgress } from "@/components/admin/IngestProgress";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";
import { ALL_KINDS } from "@/lib/ingest/pipeline";
import { STEAM_KIND_TAGS } from "@/lib/steam/client";
import {
  getManualIngestPrefs,
  MAX_MANUAL_PAGES_PER_KIND,
} from "@/lib/admin/ingest-prefs";

const DEFAULT_PAGES_PER_KIND = 20;

export const dynamic = "force-dynamic";

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function IngestPage() {
  const user = await getCurrentUser();
  if (!user || !isCreator(effectiveRole(user))) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-purple-500/40 bg-purple-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-purple-200">Creator only.</div>
        <p className="mt-2 text-purple-100/80">
          Ingest runs are expensive and can reshape the public catalogue, so
          they&apos;re reserved for the site Creator. Moderators see newly
          ingested items land in{" "}
          <Link href="/admin/triage" className="underline">Triage</Link> once a
          run finishes.
        </p>
      </div>
    );
  }

  const db = getDb();
  const [runs, prefs] = await Promise.all([
    db
      .select()
      .from(ingestRuns)
      .orderBy(desc(ingestRuns.startedAt))
      .limit(20),
    getManualIngestPrefs(),
  ]);
  const selectedKinds = new Set(prefs.kinds ?? ALL_KINDS);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ingest runs</h1>
          <p className="text-sm text-foreground/50">
            Most recent 20 runs. Already-approved and already-rejected items
            are skipped entirely, so the pipeline keeps paging past them
            until it gathers genuinely new items per kind.
          </p>
        </div>
        <form
          action={triggerIngest}
          className="flex w-full max-w-md flex-col gap-3 rounded-md border border-border bg-card p-3 sm:w-auto"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-foreground/60">
              Order
              <select
                name="order"
                defaultValue={prefs.order}
                className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              >
                <option value="trend">Best (trending)</option>
                <option value="new">Newest</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground/60">
              Pages per kind
              <input
                type="number"
                name="pagesPerKind"
                min={1}
                max={MAX_MANUAL_PAGES_PER_KIND}
                defaultValue={prefs.pagesPerKind ?? DEFAULT_PAGES_PER_KIND}
                className="w-20 rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <FormSubmitButton
              pendingLabel="Running…"
              spinnerSize="sm"
              toastSuccess="Ingest run complete — see the table for counts."
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
            >
              Run ingest now
            </FormSubmitButton>
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-foreground/60">
              Kinds (leave all ticked for everything)
            </legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-foreground/80 sm:grid-cols-3">
              {ALL_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="kinds"
                    value={k}
                    defaultChecked={selectedKinds.has(k)}
                    className="h-3.5 w-3.5 rounded border-border bg-background accent-accent"
                  />
                  {STEAM_KIND_TAGS[k]}
                </label>
              ))}
            </div>
          </fieldset>
          {/* Inside the form so useFormStatus sees it. Component self-hides
              when there's nothing in flight. */}
          <IngestProgress />
        </form>
      </header>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Fetched</th>
              <th className="px-3 py-2">New</th>
              <th className="px-3 py-2">Errors</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-foreground/50">
                  No runs yet.
                </td>
              </tr>
            )}
            {runs.map((r) => {
              const errorCount = Array.isArray(r.errors) ? r.errors.length : 0;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground/80">
                    {r.startedAt?.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-3 py-2 text-foreground/60">
                    {formatDuration(r.startedAt, r.endedAt)}
                  </td>
                  <td className="px-3 py-2">{r.fetched}</td>
                  <td className="px-3 py-2">{r.newItems}</td>
                  <td
                    className={errorCount > 0 ? "px-3 py-2 text-red-400" : "px-3 py-2 text-foreground/60"}
                  >
                    {errorCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
