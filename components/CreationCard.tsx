import Image from "next/image";
import Link from "next/link";
import type { CreationCardRow } from "@/lib/db/queries";

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

export function CreationCard({ creation }: { creation: CreationCardRow }) {
  const kindLabel = KIND_LABELS[creation.kind] ?? creation.kind;
  return (
    <Link
      href={`/creation/${creation.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent"
    >
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
          <div className="flex h-full items-center justify-center text-sm text-white/30">
            no thumbnail
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/80">
          {kindLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="truncate font-medium group-hover:text-accent">
          {creation.title}
        </div>
        <div className="truncate text-xs text-white/50">
          {creation.authorName ? `by ${creation.authorName}` : "\u00A0"}
        </div>
        <div className="mt-auto flex gap-3 pt-2 text-[11px] text-white/45">
          <span>{creation.subscriptions.toLocaleString()} subs</span>
          <span>{creation.favorites.toLocaleString()} favs</span>
          {creation.voteScore != null && (
            <span>{Math.round(creation.voteScore * 100)}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CreationGrid({ items }: { items: CreationCardRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-white/50">
        No approved creations match these filters yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <CreationCard key={c.id} creation={c} />
      ))}
    </div>
  );
}
