import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserSubmissions } from "@/lib/db/queries";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending review", className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  approved: { label: "Approved",       className: "border-green-500/40 bg-green-500/10 text-green-300" },
  rejected: { label: "Not accepted",   className: "border-red-500/40 bg-red-500/10 text-red-300" },
  archived: { label: "Archived",       className: "border-foreground/20 bg-foreground/5 text-foreground/50" },
  deleted:  { label: "Deleted",        className: "border-foreground/20 bg-foreground/5 text-foreground/30 line-through" },
};

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/me/submissions");

  const items = await getUserSubmissions(user.steamid, 50);
  const { t } = await getT();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t("me.submissions.title")}</h1>
      </header>

      {items.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
          {t("me.submissions.empty")}{" "}
          <Link href="/submit" className="text-accent hover:underline">
            {t("submit.title")}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/5 rounded-xl border border-border bg-card/40">
          {items.map((item) => {
            const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
            return (
              <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                {item.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "approved" ? (
                      <Link
                        href={`/creation/${item.shortId}`}
                        className="font-medium text-foreground hover:underline truncate"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground/80 truncate">{item.title}</span>
                    )}
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/40 capitalize">
                    {item.kind} · submitted{" "}
                    {item.ingestedAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={item.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-foreground/30 hover:text-foreground/70"
                >
                  Steam ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
