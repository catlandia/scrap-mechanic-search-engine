import Image from "next/image";
import Link from "next/link";
import type { CreationCardRow } from "@/lib/db/queries";
import { StarRating } from "@/components/StarRating";
import type { RatingMode } from "@/lib/prefs";

const KIND_LABELS: Record<string, string> = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain",
  other: "Other",
};

export function CreationCard({
  creation,
  ratingMode = "both",
}: {
  creation: CreationCardRow;
  ratingMode?: RatingMode;
}) {
  const kindLabel = KIND_LABELS[creation.kind] ?? creation.kind;
  const showSteam = ratingMode === "steam" || ratingMode === "both";
  const showSite = ratingMode === "site" || ratingMode === "both";
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent">
      <Link href={`/creation/${creation.shortId}`} className="flex flex-1 flex-col">
        <div className="relative aspect-video bg-black">
          {creation.thumbnailUrl ? (
            <Image
              src={creation.thumbnailUrl}
              alt={creation.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-foreground/30">
              no thumbnail
            </div>
          )}
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/80">
            {kindLabel}
          </span>
          <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-foreground/70">
            #{creation.shortId}
          </span>
          {creation.uploadedByUserId && (
            <span className="absolute bottom-2 left-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-200">
              Community
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3 pb-1">
          <div className="truncate font-medium group-hover:text-accent">
            {creation.title}
          </div>
          <div className="flex flex-col gap-0.5">
            {showSteam && (
              <StarRating
                score={creation.voteScore}
                votesUp={creation.votesUp}
                votesDown={creation.votesDown}
                size="xs"
                color="green"
                tag="steam"
              />
            )}
            {showSite && (
              <SiteStars
                up={creation.siteWeightedUp}
                down={creation.siteWeightedDown}
              />
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-0.5">
        <div className="min-w-0 truncate text-xs text-foreground/50">
          {creation.authorName && creation.authorSteamid ? (
            <>
              by{" "}
              <Link
                href={`/author/${creation.authorSteamid}`}
                className="hover:text-accent"
              >
                {creation.authorName}
              </Link>
            </>
          ) : creation.authorName ? (
            `by ${creation.authorName}`
          ) : (
            "\u00A0"
          )}
        </div>
        <div className="flex shrink-0 gap-2 text-[11px] text-foreground/45">
          <span title="Subscribers">{creation.subscriptions.toLocaleString()}↓</span>
          <span title="Favourites">{creation.favorites.toLocaleString()}★</span>
        </div>
      </div>
    </article>
  );
}

function SiteStars({ up, down }: { up: number; down: number }) {
  const total = up + down;
  if (total === 0) return null;
  const score = total > 0 ? up / total : null;
  return (
    <StarRating
      score={score}
      votesUp={up}
      votesDown={down}
      size="xs"
      color="orange"
      tag="site"
    />
  );
}

export function CreationGrid({
  items,
  ratingMode = "both",
}: {
  items: CreationCardRow[];
  ratingMode?: RatingMode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/50">
        No approved creations match these filters yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <CreationCard key={c.id} creation={c} ratingMode={ratingMode} />
      ))}
    </div>
  );
}
