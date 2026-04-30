import Link from "next/link";
import { getCommentsByAuthor } from "@/lib/db/queries";
import { getT } from "@/lib/i18n/server";

const PREVIEW_LIMIT = 240;

function preview(body: string): string {
  const stripped = body.replace(/\s+/g, " ").trim();
  if (stripped.length <= PREVIEW_LIMIT) return stripped;
  return stripped.slice(0, PREVIEW_LIMIT - 1).trimEnd() + "…";
}

export async function RecentComments({
  steamid,
  viewerIsMod,
}: {
  steamid: string;
  viewerIsMod: boolean;
}) {
  const rows = await getCommentsByAuthor(steamid, viewerIsMod, 25);
  if (rows.length === 0) return null;

  const { t } = await getT();

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/60 px-4 py-5">
      <h2 className="text-xs uppercase tracking-widest text-foreground/40">
        {t("profile.recentComments")}
      </h2>
      <ol className="space-y-3">
        {rows.map((row) => {
          const isDeleted = row.deletedAt != null;
          const targetHref = row.creationTarget
            ? `/creation/${row.creationTarget.shortId ?? row.creationTarget.id}#comment-${row.id}`
            : row.profileTarget
              ? `/profile/${row.profileTarget.steamid}#comment-${row.id}`
              : null;
          const targetLabel = row.creationTarget
            ? row.creationTarget.title
            : row.profileTarget
              ? t("profile.commentOnWall", {
                  name: row.profileTarget.personaName,
                })
              : t("profile.commentDeletedTarget");
          return (
            <li
              key={row.id}
              className="rounded border border-foreground/10 bg-background/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-foreground/50">
                {targetHref ? (
                  <Link
                    href={targetHref}
                    className="text-accent hover:underline"
                  >
                    {targetLabel}
                  </Link>
                ) : (
                  <span>{targetLabel}</span>
                )}
                <time
                  dateTime={row.createdAt.toISOString()}
                  title={row.createdAt.toLocaleString()}
                >
                  {row.createdAt.toLocaleDateString()}
                </time>
              </div>
              <p
                className={`mt-1 whitespace-pre-wrap text-sm ${
                  isDeleted
                    ? "italic text-foreground/40"
                    : "text-foreground/80"
                }`}
              >
                {isDeleted
                  ? t("profile.commentDeleted")
                  : preview(row.body)}
              </p>
              {(row.votesUp > 0 || row.votesDown > 0) && (
                <div className="mt-1 text-[11px] text-foreground/40">
                  ↑{row.votesUp} · ↓{row.votesDown}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
