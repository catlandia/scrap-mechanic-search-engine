import Image from "next/image";
import Link from "next/link";
import { getActionedReports, getOpenReports } from "@/lib/db/queries";
import {
  actionReport,
  archiveFromReport,
  clearReport,
} from "@/app/admin/actions";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { UserRole } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  wrong_tags: "Wrong tags",
  poor_quality: "Poor quality",
  spam: "Spam",
  not_scrap_mechanic: "Not Scrap Mechanic",
  other: "Other",
};

export default async function ReportsQueuePage() {
  const [rows, flagged] = await Promise.all([
    getOpenReports(50),
    getActionedReports(50),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Report queue</h1>
            <p className="text-sm text-white/60">
              Open reports. Clear to dismiss, or Action to mark the creation
              publicly with a moderator note.
            </p>
          </div>
          <span className="text-sm text-white/50">
            {rows.length} open
          </span>
        </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
          <div className="text-lg font-semibold">No open reports.</div>
          <div className="mt-1 text-emerald-100/80">
            The queue is empty. Auto-reports will land here when a creation&apos;s
            site vote score hits −5.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article
              key={r.id}
              className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[200px,1fr]"
            >
              <Link
                href={`/creation/${r.creationShortId}`}
                className="block overflow-hidden rounded-md"
              >
                {r.creationThumbnail ? (
                  <div className="relative aspect-video bg-black">
                    <Image
                      src={r.creationThumbnail}
                      alt={r.creationTitle}
                      fill
                      unoptimized
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded bg-black/40" />
                )}
              </Link>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/creation/${r.creationShortId}`}
                      className="block truncate font-medium hover:text-accent"
                    >
                      #{r.creationShortId} — {r.creationTitle}
                    </Link>
                    <a
                      href={r.creationSteamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-white/40 hover:text-accent"
                    >
                      steam ↗
                    </a>
                  </div>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-200">
                    {REASON_LABELS[r.reason] ?? r.reason}
                  </span>
                </div>

                <div className="text-xs text-white/50">
                  {r.source === "auto" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      🤖 auto-filed
                    </span>
                  ) : r.reporterName ? (
                    <>
                      reported by{" "}
                      <UserName
                        name={r.reporterName}
                        role={r.reporterRole as UserRole | null}
                        steamid={r.reporterSteamid ?? undefined}
                      />
                      <RoleBadge
                        role={r.reporterRole as UserRole | null}
                        className="ml-2"
                      />
                    </>
                  ) : (
                    "reported"
                  )}
                  <span className="ml-2 text-white/30">
                    · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>

                {r.customText && (
                  <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-white/70">
                    {r.customText}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={clearReport}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white"
                      >
                        Clear
                      </button>
                    </form>
                    <form
                      action={actionReport}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="reportId" value={r.id} />
                      <input
                        type="text"
                        name="note"
                        placeholder="Mod note (shown publicly)"
                        className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400"
                      >
                        Action
                      </button>
                    </form>
                  </div>
                  <form
                    action={archiveFromReport}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="reportId" value={r.id} />
                    <input
                      type="text"
                      name="note"
                      placeholder="Archive note (optional)"
                      className="flex-1 rounded border border-red-500/30 bg-red-500/5 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-red-500/60 bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-500/30"
                    >
                      Archive creation
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      </section>

      <section className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border pt-6">
          <div>
            <h2 className="text-xl font-semibold">Currently flagged</h2>
            <p className="text-sm text-white/60">
              Creations with a public moderator flag. Clear the flag to remove
              the public badge — the report itself moves to &quot;cleared&quot;.
            </p>
          </div>
          <span className="text-sm text-white/50">{flagged.length} flagged</span>
        </header>

        {flagged.length === 0 ? (
          <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm text-white/50">
            No creations are currently flagged.
          </div>
        ) : (
          <div className="space-y-3">
            {flagged.map((f) => (
              <article
                key={f.id}
                className="grid gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 md:grid-cols-[140px,1fr]"
              >
                <Link
                  href={`/creation/${f.creationShortId}`}
                  className="block overflow-hidden rounded-md"
                >
                  {f.creationThumbnail ? (
                    <div className="relative aspect-video bg-black">
                      <Image
                        src={f.creationThumbnail}
                        alt={f.creationTitle}
                        fill
                        unoptimized
                        sizes="140px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded bg-black/40" />
                  )}
                </Link>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      href={`/creation/${f.creationShortId}`}
                      className="min-w-0 truncate font-medium hover:text-accent"
                    >
                      #{f.creationShortId} — {f.creationTitle}
                    </Link>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-200">
                      {REASON_LABELS[f.reason] ?? f.reason}
                    </span>
                  </div>

                  {f.resolverNote && (
                    <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-white/70">
                      {f.resolverNote}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    {f.resolverName ? (
                      <>
                        flagged by{" "}
                        <UserName
                          name={f.resolverName}
                          role={f.resolverRole as UserRole | null}
                          steamid={f.resolverSteamid ?? undefined}
                        />
                        <RoleBadge role={f.resolverRole as UserRole | null} />
                      </>
                    ) : (
                      <span>flagged</span>
                    )}
                    {f.resolvedAt && (
                      <span className="text-white/30">
                        · {new Date(f.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <form action={clearReport} className="pt-1">
                    <input type="hidden" name="reportId" value={f.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-white/70 hover:border-emerald-400/60 hover:text-emerald-200"
                    >
                      Clear flag
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
