import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCreationDetail } from "@/lib/db/queries";

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
  return {
    title: detail.creation.title,
    description: detail.creation.descriptionClean.slice(0, 180),
    openGraph: detail.creation.thumbnailUrl
      ? { images: [detail.creation.thumbnailUrl] }
      : undefined,
  };
}

export default async function CreationDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getCreationDetail(id);
  if (!detail) notFound();

  const { creation, tags, categories } = detail;
  if (creation.status !== "approved") notFound();

  const kindLabel = KIND_LABELS[creation.kind] ?? creation.kind;

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

      <div className="grid gap-4 text-sm text-white/60 sm:grid-cols-4">
        <Stat label="Subscriptions" value={creation.subscriptions.toLocaleString()} />
        <Stat label="Favorites" value={creation.favorites.toLocaleString()} />
        <Stat label="Views" value={creation.views.toLocaleString()} />
        <Stat
          label="Rating"
          value={creation.voteScore != null ? `${Math.round(creation.voteScore * 100)}%` : "—"}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/search?tags=${t.slug}`}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-white/70 hover:border-accent hover:text-accent"
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      <p className="whitespace-pre-wrap text-base leading-relaxed text-white/80">
        {creation.descriptionClean || "(no description)"}
      </p>

      <div className="flex gap-3 pt-2">
        <a
          href={creation.steamUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          View on Steam Workshop ↗
        </a>
      </div>
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
