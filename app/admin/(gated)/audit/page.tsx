import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { modActions, users } from "@/lib/db/schema";
import { parsePageIndex } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  page?: string;
  actor?: string;
  action?: string;
  target?: string;
}>;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const pageIndex = parsePageIndex(sp.page);
  const actorFilter = (sp.actor ?? "").trim();
  const actionFilter = (sp.action ?? "").trim();
  const targetFilter = (sp.target ?? "").trim();

  const db = getDb();

  const whereClauses = [] as ReturnType<typeof and>[];
  if (actorFilter) {
    whereClauses.push(eq(modActions.actorUserId, actorFilter));
  }
  if (actionFilter) {
    whereClauses.push(eq(modActions.action, actionFilter));
  }
  if (targetFilter) {
    // format: targetType:targetId, or just a targetId.
    const [type, id] = targetFilter.includes(":")
      ? targetFilter.split(":", 2)
      : [null, targetFilter];
    if (type) {
      whereClauses.push(eq(modActions.targetType, type));
    }
    if (id) {
      whereClauses.push(eq(modActions.targetId, id));
    }
  }
  const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

  const [rows, totalRow, actionCountRow] = await Promise.all([
    db
      .select({
        id: modActions.id,
        actorUserId: modActions.actorUserId,
        actorName: modActions.actorName,
        actorPersona: users.personaName,
        action: modActions.action,
        targetType: modActions.targetType,
        targetId: modActions.targetId,
        summary: modActions.summary,
        metadata: modActions.metadata,
        createdAt: modActions.createdAt,
      })
      .from(modActions)
      .leftJoin(users, eq(users.steamid, modActions.actorUserId))
      .where(where)
      .orderBy(desc(modActions.createdAt))
      .limit(PAGE_SIZE)
      .offset(pageIndex * PAGE_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(modActions)
      .where(where)
      .then((r) => r[0]),
    db
      .select({
        action: modActions.action,
        n: sql<number>`count(*)::int`,
      })
      .from(modActions)
      .groupBy(modActions.action)
      .orderBy(sql`count(*) desc`)
      .limit(15),
  ]);

  const total = totalRow?.n ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const qs = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const all = {
      page: String(pageIndex + 1),
      actor: actorFilter || null,
      action: actionFilter || null,
      target: targetFilter || null,
      ...overrides,
    };
    for (const [k, v] of Object.entries(all)) {
      if (v && v !== "0" && v !== "1") params.set(k, v);
      else if (k === "page" && v && v !== "1") params.set(k, v);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-foreground/60">
          Every mod-facing action since V9.1. Use this to answer &quot;who did
          what, when&quot; without digging through git. Mod+ can view; nobody
          can edit or delete rows from the UI.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/40 p-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-foreground/60">Actor steamid</span>
          <input
            type="text"
            name="actor"
            defaultValue={actorFilter}
            placeholder="e.g. 7656119..."
            className="w-48 rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/60">Action</span>
          <select
            name="action"
            defaultValue={actionFilter}
            className="w-44 rounded border border-border bg-background px-2 py-1"
          >
            <option value="">Any</option>
            {actionCountRow.map((r) => (
              <option key={r.action} value={r.action}>
                {r.action} ({r.n})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/60">Target (type:id)</span>
          <input
            type="text"
            name="target"
            defaultValue={targetFilter}
            placeholder="e.g. creation:3706129300"
            className="w-56 rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1 font-medium text-black hover:bg-accent-strong"
        >
          Filter
        </button>
        {(actorFilter || actionFilter || targetFilter) && (
          <Link
            href="/admin/audit"
            className="text-foreground/60 underline hover:text-foreground"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto text-foreground/50">
          {total.toLocaleString()} total entries
        </span>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-[11px] uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-foreground/50"
                >
                  No audit rows match these filters yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-foreground/70">
                  {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-3 py-2">
                  {r.actorUserId ? (
                    <Link
                      href={`/profile/${r.actorUserId}`}
                      className="text-accent hover:underline"
                    >
                      {r.actorPersona ?? r.actorName ?? r.actorUserId}
                    </Link>
                  ) : (
                    <span className="text-foreground/40">system</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-foreground/80">
                  {r.action}
                </td>
                <td className="px-3 py-2 font-mono text-foreground/70">
                  {r.targetType && r.targetId ? (
                    <span>
                      {r.targetType}:{r.targetId}
                    </span>
                  ) : r.targetId ? (
                    <span>{r.targetId}</span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-foreground/80">
                  <div>{r.summary ?? ""}</div>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <details className="mt-1 text-[11px] text-foreground/50">
                      <summary className="cursor-pointer">meta</summary>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between text-sm">
        {pageIndex > 0 ? (
          <Link
            href={`/admin/audit${qs({ page: String(pageIndex) })}`}
            className="text-accent hover:underline"
          >
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        <span className="text-foreground/50">
          Page {pageIndex + 1} of {maxPage + 1}
        </span>
        {pageIndex < maxPage ? (
          <Link
            href={`/admin/audit${qs({ page: String(pageIndex + 2) })}`}
            className="text-accent hover:underline"
          >
            Older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
