import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  getCreationComments,
  getCreationDetail,
  getCreationSiteCounts,
  getCreationTagsWithVotes,
  getCreationVoteBreakdown,
  getPublicReportBadge,
  getUserVoteOnCreation,
  isCreationFavourited,
  recordCreationView,
} from "@/lib/db/queries";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { UserName } from "@/components/UserName";
import { RoleBadge } from "@/components/RoleBadge";
import { StarRating, sentimentLabel } from "@/components/StarRating";
import { CommentSection } from "@/components/CommentSection";
import { CreationVotePanel } from "@/components/CreationVotePanel";
import { CreatorTagRemoveButton } from "@/components/CreatorTagRemoveButton";
import { DeleteCreationButton } from "@/components/DeleteCreationButton";
import { FavouriteButton } from "@/components/FavouriteButton";
import { ReportButton } from "@/components/ReportButton";
import { ReportBadge } from "@/components/ReportBadge";
import { TagVoteList } from "@/components/TagVoteList";
import { isCreator, isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { getRatingMode } from "@/lib/prefs.server";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain Asset",
  other: "Other",
};

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getCreationDetail(id);
  if (!detail || detail.creation.status !== "approved") return {};
  const { creation } = detail;
  const byLine = creation.authorName ? `by ${creation.authorName}. ` : "";
  const snippet = creation.descriptionClean.slice(0, 180 - byLine.length).trim();
  const description = `${byLine}${snippet}`.slice(0, 200);
  const canonical = `/creation/${creation.shortId}`;
  const images = creation.thumbnailUrl ? [creation.thumbnailUrl] : [];
  return {
    title: creation.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: creation.title,
      description,
      type: "article",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: creation.title,
      description,
      images,
    },
  };
}

export default async function CreationDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getCreationDetail(id);
  if (!detail) notFound();

  const { creation, categories } = detail;
  if (creation.status !== "approved") notFound();

  const viewer = await getCurrentUser();

  // Record the view BEFORE we fetch counts so the viewer's own visit is
  // reflected in the Site-views number they see.
  if (viewer) {
    try {
      await recordCreationView(creation.id, viewer.steamid);
    } catch (err) {
      console.error("recordCreationView failed:", err);
    }
  }

  const [
    tagsWithVotes,
    viewerCreationVote,
    viewerFavourited,
    voteBreakdown,
    siteCounts,
    reportBadge,
    commentRows,
    uploaderRow,
  ] = await Promise.all([
    getCreationTagsWithVotes(creation.id, viewer?.steamid ?? null),
    viewer ? getUserVoteOnCreation(creation.id, viewer.steamid) : Promise.resolve(0 as const),
    viewer ? isCreationFavourited(creation.id, viewer.steamid) : Promise.resolve(false),
    getCreationVoteBreakdown(creation.id),
    getCreationSiteCounts(creation.id),
    getPublicReportBadge(creation.id),
    getCreationComments(creation.id, 100),
    creation.uploadedByUserId
      ? getDb()
          .select()
          .from(users)
          .where(eq(users.steamid, creation.uploadedByUserId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  const uploader = uploaderRow;

  const viewerIsCreator = isCreator(viewer?.role as UserRole | undefined);
  const visibleTags = tagsWithVotes.filter((t) => !t.rejected);
  const confirmedTags = visibleTags.filter((t) => t.confirmed);
  const communityTags = visibleTags
    .filter((t) => !t.confirmed && t.up - t.down >= 3)
    .sort((a, b) => b.up - b.down - (a.up - a.down))
    .slice(0, 5);
  // Creator sees all non-rejected tags so they can remove any of them.
  const displayTags = viewerIsCreator
    ? visibleTags
    : [...confirmedTags, ...communityTags];

  // All non-rejected tags remain in the vote panel so users can tip weak tags
  // over threshold even though they don't yet render in `displayTags`.
  const votableTags = visibleTags;

  const kindLabel = KIND_LABELS[creation.kind] ?? creation.kind;
  const siteTotal = voteBreakdown.up + voteBreakdown.down;
  const siteScore = siteTotal > 0 ? voteBreakdown.up / siteTotal : null;
  const ratingMode = await getRatingMode();
  const showSteamRating = ratingMode === "steam" || ratingMode === "both";
  const showSiteRating = ratingMode === "site" || ratingMode === "both";

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link href="/new" className="text-sm text-white/60 hover:text-accent">
        ← Back to newest
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-white/50">
          <span className="rounded bg-accent/20 px-2 py-0.5 text-accent">{kindLabel}</span>
          {categories.map((c) => (
            <Link key={c.id} href={`/search?category=${c.slug}`} className="hover:text-white">
              {c.name}
            </Link>
          ))}
        </div>
        <h1 className="text-3xl font-bold">{creation.title}</h1>
        {creation.authorName && (
          <p className="text-sm text-white/60">
            by{" "}
            {creation.authorSteamid ? (
              <Link
                href={`/author/${creation.authorSteamid}`}
                className="text-accent hover:underline"
              >
                {creation.authorName}
              </Link>
            ) : (
              creation.authorName
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-4 pt-1 font-mono text-[11px] text-white/45">
          <span>
            <span className="text-white/35">ID:</span> #{creation.shortId}
          </span>
          <span>
            <span className="text-white/35">Steam:</span> {creation.id}
          </span>
        </div>
        {uploader && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200">
              Community added
            </span>
            <span>
              submitted by{" "}
              <UserName
                name={uploader.personaName}
                role={uploader.role as UserRole}
                steamid={uploader.steamid}
              />
            </span>
            <RoleBadge role={uploader.role as UserRole} />
          </p>
        )}
      </header>

      {creation.thumbnailUrl && (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <Image
            src={creation.thumbnailUrl}
            alt={creation.title}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
          />
        </div>
      )}

      <div className="grid gap-4 text-sm text-white/60 sm:grid-cols-2 md:grid-cols-3">
        <Stat label="Subscribers" value={creation.subscriptions.toLocaleString()} />
        <SplitStat
          label="Favourites"
          a={{ sublabel: "Steam", value: creation.favorites.toLocaleString() }}
          b={{
            sublabel: "Site",
            value: siteCounts.siteFavourites.toLocaleString(),
          }}
        />
        <SplitStat
          label="Views"
          a={{ sublabel: "Steam", value: creation.views.toLocaleString() }}
          b={{
            sublabel: "Site",
            value: siteCounts.siteViews.toLocaleString(),
            hint: "signed-in viewers",
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {showSteamRating && (
          <div className="rounded-md border border-border bg-card/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Steam rating
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <StarRating
                score={creation.voteScore}
                votesUp={creation.votesUp}
                votesDown={creation.votesDown}
                size="md"
                color="green"
                showLabel={true}
              />
              {creation.voteScore != null &&
                ((creation.votesUp ?? 0) + (creation.votesDown ?? 0)) >= 10 && (
                  <div className="text-[10px] text-white/50">
                    {sentimentLabel(
                      (creation.votesUp ?? 0) /
                        Math.max(1, (creation.votesUp ?? 0) + (creation.votesDown ?? 0)),
                    )}{" "}
                    ·{" "}
                    {((creation.votesUp ?? 0) + (creation.votesDown ?? 0)).toLocaleString()} votes
                  </div>
                )}
            </div>
          </div>
        )}
        {showSiteRating && (
          <div className="rounded-md border border-border bg-card/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Site rating
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <StarRating
                score={siteScore}
                votesUp={voteBreakdown.up}
                votesDown={voteBreakdown.down}
                size="md"
                color="orange"
                showLabel={true}
              />
              {siteScore != null && (
                <div className="text-[10px] text-white/50">
                  {sentimentLabel(siteScore)} · {siteTotal.toLocaleString()} votes
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreationVotePanel
        creationId={creation.id}
        initialUserVote={viewerCreationVote}
        breakdown={voteBreakdown}
        signedIn={!!viewer}
      />

      <div className="flex flex-wrap items-center gap-3">
        <FavouriteButton
          creationId={creation.id}
          initialFavourited={viewerFavourited}
          signedIn={!!viewer}
        />
        <ReportButton creationId={creation.id} signedIn={!!viewer} />
        <a
          href={creation.steamUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          View on Steam Workshop ↗
        </a>
        {isCreator(viewer?.role as UserRole | undefined) && (
          <DeleteCreationButton
            creationId={creation.id}
            creationTitle={creation.title}
          />
        )}
      </div>

      {reportBadge && <ReportBadge badge={reportBadge} />}

      {displayTags.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((t) => {
              return (
                <span
                  key={t.tagId}
                  className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs"
                >
                  <Link
                    href={`/search?tags=${t.slug}`}
                    className="text-white/70 hover:text-accent"
                  >
                    {t.name}
                  </Link>
                  {viewerIsCreator && (
                    <CreatorTagRemoveButton
                      creationId={creation.id}
                      tagId={t.tagId}
                      tagName={t.name}
                    />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            Vote on tags
          </div>
          <div className="text-[10px] text-white/30">
            Community tags appear publicly at +3 net votes.
          </div>
        </div>
        <TagVoteList
          creationId={creation.id}
          tags={votableTags}
          signedIn={!!viewer}
        />
      </div>

      <p className="whitespace-pre-wrap text-base leading-relaxed text-white/80">
        {creation.descriptionClean || "(no description)"}
      </p>

      <CommentSection
        creationId={creation.id}
        comments={commentRows}
        viewerSteamid={viewer?.steamid ?? null}
        viewerIsMod={isModerator(viewer?.role as UserRole | undefined)}
        viewerCanPost={!!viewer && !isBanned(viewer) && !isMuted(viewer)}
      />
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-0.5 text-base font-medium text-white">{value}</div>
    </div>
  );
}

function SplitStat({
  label,
  a,
  b,
}: {
  label: string;
  a: { sublabel: string; value: string; hint?: string };
  b: { sublabel: string; value: string; hint?: string };
}) {
  return (
    <div className="rounded-md border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div title={a.hint}>
          <div className="text-[9px] uppercase tracking-wider text-emerald-400/70">
            {a.sublabel}
          </div>
          <div className="text-base font-medium text-white">{a.value}</div>
        </div>
        <div title={b.hint}>
          <div className="text-[9px] uppercase tracking-wider text-orange-400/80">
            {b.sublabel}
          </div>
          <div className="text-base font-medium text-white">{b.value}</div>
        </div>
      </div>
    </div>
  );
}
