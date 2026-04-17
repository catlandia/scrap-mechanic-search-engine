import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { ingestRuns } from "@/lib/db/schema";
import { triggerIngest } from "@/app/admin/actions";

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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ingest runs</h1>
          <p className="text-sm text-white/50">Most recent 20 runs.</p>
        </div>
        <form action={triggerIngest}>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Run ingest now
          </button>
        </form>
      </header>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-white/50">
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
                <td colSpan={5} className="px-3 py-4 text-center text-white/50">
                  No runs yet.
                </td>
              </tr>
            )}
            {runs.map((r) => {
              const errorCount = Array.isArray(r.errors) ? r.errors.length : 0;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-white/80">
                    {r.startedAt?.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {formatDuration(r.startedAt, r.endedAt)}
                  </td>
                  <td className="px-3 py-2">{r.fetched}</td>
                  <td className="px-3 py-2">{r.newItems}</td>
                  <td
                    className={errorCount > 0 ? "px-3 py-2 text-red-400" : "px-3 py-2 text-white/60"}
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
