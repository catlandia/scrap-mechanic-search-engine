import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  deleteCreation,
  restoreFromArchive,
} from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import {
  isCreator,
  isEliteModerator,
  isModerator,
} from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const viewer = await getCurrentUser();
  const role = viewer?.role as UserRole | undefined;
  if (!isModerator(role)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">
          Not allowed.
        </div>
        <p className="mt-2 text-red-100/80">
          Only moderators and above can view the archive.
        </p>
      </div>
    );
  }
  const viewerIsCreator = isCreator(role);
  const viewerCanRestore = isEliteModerator(role);

  const db = getDb();
  const rows = await db
    .select()
    .from(creations)
    .where(eq(creations.status, "archived"))
    .orderBy(desc(creations.reviewedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-sm text-white/60">
          Creations that were public and have been pulled. Moderators can
          view; elite moderators and the Creator can restore. Only the
          Creator can permanently delete — perma-deleted items can never be
          re-ingested.
        </p>
        {!viewerCanRestore && (
          <p className="text-xs text-amber-300/80">
            View-only — you need elite moderator to restore items.
          </p>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
          Archive is empty.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <article
              key={c.id}
              className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[160px,1fr]"
            >
              <div className="block overflow-hidden rounded-md">
                {c.thumbnailUrl ? (
                  <div className="relative aspect-video bg-black">
                    <Image
                      src={c.thumbnailUrl}
                      alt={c.title}
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded bg-black/40" />
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      #{c.shortId} — {c.title}
                    </div>
                    <div className="text-xs text-white/40">
                      {c.authorName ? `by ${c.authorName} · ` : ""}
                      archived{" "}
                      {c.reviewedAt
                        ? new Date(c.reviewedAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <a
                    href={c.steamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-white/40 hover:text-accent"
                  >
                    steam ↗
                  </a>
                </div>

                <p className="line-clamp-2 text-sm text-white/60">
                  {c.descriptionClean?.slice(0, 240) || "(no description)"}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {viewerCanRestore && (
                    <form action={restoreFromArchive}>
                      <input type="hidden" name="creationId" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Restore to public
                      </button>
                    </form>
                  )}
                  {viewerIsCreator && (
                    <form action={deleteCreation}>
                      <input type="hidden" name="creationId" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-500/20"
                      >
                        Permanently delete
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/creation/${c.shortId}`}
                    className="text-xs text-white/40 hover:text-accent"
                  >
                    view detail (hidden)
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
