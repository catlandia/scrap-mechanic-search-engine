"use client";

import Image from "next/image";
import { useState } from "react";
import {
  approveCreation,
  rejectCreation,
  saveCreationTags,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const KIND_OPTIONS = [
  { value: "blueprint", label: "Blueprint" },
  { value: "mod", label: "Mod" },
  { value: "world", label: "World" },
  { value: "challenge", label: "Challenge" },
  { value: "tile", label: "Tile" },
  { value: "custom_game", label: "Custom Game" },
  { value: "terrain_asset", label: "Terrain Asset" },
  { value: "other", label: "Other" },
];

interface Creation {
  id: string;
  title: string;
  descriptionClean: string;
  thumbnailUrl: string | null;
  steamUrl: string;
  kind: string;
  subscriptions: number;
  favorites: number;
  voteScore: number | null;
  authorName: string | null;
  steamTags: string[];
}

interface Tag {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
}

interface Suggestion {
  tagId: number;
  source: string;
  confidence: number | null;
}

interface Category {
  id: number;
  name: string;
}

interface Props {
  creation: Creation;
  suggested: Suggestion[];
  allTags: Tag[];
  allCategories: Category[];
}

export function QueueItem({ creation, suggested, allTags, allCategories }: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(suggested.map((s) => s.tagId)),
  );
  const [kind, setKind] = useState(creation.kind);
  const [expanded, setExpanded] = useState(false);
  const confidenceByTag = new Map(suggested.map((s) => [s.tagId, s.confidence ?? 0]));
  const sourceByTag = new Map(suggested.map((s) => [s.tagId, s.source]));

  function toggle(tagId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  const tagsByCategory = new Map<number | null, Tag[]>();
  for (const t of allTags) {
    const key = t.categoryId ?? null;
    const bucket = tagsByCategory.get(key) ?? [];
    bucket.push(t);
    tagsByCategory.set(key, bucket);
  }
  const categoryOrder: (number | null)[] = [
    ...allCategories.map((c) => c.id),
    null,
  ];
  const categoryNameById = new Map(allCategories.map((c) => [c.id, c.name]));

  const description = creation.descriptionClean || "(no description)";
  const shortDesc =
    description.length > 240 && !expanded
      ? description.slice(0, 240) + "…"
      : description;

  return (
    <form className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[240px,1fr]">
      <input type="hidden" name="creationId" value={creation.id} />
      <input type="hidden" name="kind" value={kind} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      <div className="space-y-2">
        {creation.thumbnailUrl ? (
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            <Image
              src={creation.thumbnailUrl}
              alt={creation.title}
              fill
              unoptimized
              className="object-cover"
              sizes="240px"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-md bg-black/40" />
        )}
        <a
          href={creation.steamUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-white/60 hover:text-accent"
        >
          steamcommunity.com →
        </a>
        <div className="text-xs text-white/50">
          {creation.subscriptions.toLocaleString()} subs ·{" "}
          {creation.favorites.toLocaleString()} favs
          {creation.voteScore != null && ` · ${Math.round(creation.voteScore * 100)}%`}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{creation.title}</h3>
            {creation.authorName && (
              <p className="text-xs text-white/50">by {creation.authorName}</p>
            )}
          </div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        <p className="whitespace-pre-wrap text-sm text-white/70">{shortDesc}</p>
        {description.length > 240 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-accent hover:underline"
          >
            {expanded ? "Show less" : "Show full description"}
          </button>
        )}

        {creation.steamTags.length > 0 && (
          <div className="text-xs text-white/40">
            Steam tags: {creation.steamTags.join(", ")}
          </div>
        )}

        <div className="space-y-2">
          {categoryOrder.map((catId) => {
            const bucket = tagsByCategory.get(catId);
            if (!bucket || bucket.length === 0) return null;
            return (
              <div key={String(catId ?? "none")}>
                <div className="mb-1 text-xs uppercase tracking-wide text-white/40">
                  {catId === null ? "Uncategorised" : categoryNameById.get(catId)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {bucket.map((t) => {
                    const active = selected.has(t.id);
                    const conf = confidenceByTag.get(t.id);
                    const src = sourceByTag.get(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs transition",
                          active
                            ? "border-accent bg-accent/20 text-accent"
                            : "border-border bg-background text-white/60 hover:border-white/30",
                        )}
                        title={
                          conf != null
                            ? `${src} · confidence ${(conf * 100).toFixed(0)}%`
                            : undefined
                        }
                      >
                        {t.name}
                        {src === "steam" && <span className="ml-1 text-[9px]">·s</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            formAction={approveCreation}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Approve
          </button>
          <button
            type="submit"
            formAction={rejectCreation}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-white/70 hover:border-red-400 hover:text-red-300"
          >
            Reject
          </button>
          <button
            type="submit"
            formAction={saveCreationTags}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white"
          >
            Save edits
          </button>
        </div>
      </div>
    </form>
  );
}
