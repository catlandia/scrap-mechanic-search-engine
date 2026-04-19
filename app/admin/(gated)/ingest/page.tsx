import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { ingestRuns } from "@/lib/db/schema";
import { triggerIngest } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const dynamic = "force-dynamic";

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function IngestPage() {
  const db = getDb();
  const runs = await db
    .select()
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.startedAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ingest runs</h1>
          <p className="text-sm text-foreground/50">
            Most recent 20 runs. Already-approved and already-rejected items
            are skipped entirely, so bumping pages-per-kind digs deeper into
            the Workshop trending list instead of re-scanning the top.
          </p>
        </div>
        <form
          action={triggerIngest}
          className="flex items-end gap-2 rounded-md border border-border bg-card p-3"
        >
          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Pages per kind
            <input
              type="number"
              name="pagesPerKind"
              min={1}
              max={20}
              defaultValue={5}
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
