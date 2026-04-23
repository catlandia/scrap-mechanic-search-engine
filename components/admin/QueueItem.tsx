"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  approveCreation,
  rejectCreation,
  saveCreationTags,
} from "@/app/admin/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

type QueueAction = "approve" | "reject" | "save";

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
  communitySubmitted: boolean;
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
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<QueueAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const successCopy: Record<QueueAction, string> = {
    approve: `Approved "${creation.title}".`,
    reject: `Rejected "${creation.title}".`,
    save: "Tag edits saved.",
  };

  // Each of the three action buttons wraps its own server action in a
  // transition so we can (a) spin the specific button the moderator hit
  // and (b) disable the others while it's in flight, without running
  // three competing submissions if they click twice.
  function dispatch(action: (fd: FormData) => Promise<unknown>, which: QueueAction) {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setPendingAction(which);
    startTransition(async () => {
      try {
        await action(fd);
        toast.success(successCopy[which]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Action failed.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  }
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
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[240px,1fr]"
    >
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
          className="block text-xs text-foreground/60 hover:text-accent"
        >
          steamcommunity.com →
        </a>
        <div className="text-xs text-foreground/50">
          {creation.subscriptions.toLocaleString()} subs ·{" "}
          {creation.favorites.toLocaleString()} favs
          {creation.voteScore != null && ` · ${Math.round(creation.voteScore * 100)}%`}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{creation.title}</h3>
              {creation.communitySubmitted && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-purple-500/50 bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-200"
                  title="A community member submitted this via /submit — rejections require a reason that will be shown to them."
                >
                  <span aria-hidden>👥</span>
                  Community submitted
                </span>
              )}
            </div>
            {creation.authorName && (
              <p className="text-xs text-foreground/50">by {creation.authorName}</p>
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

        <p className="whitespace-pre-wrap text-sm text-foreground/70">{shortDesc}</p>
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
          <div className="text-xs text-foreground/40">
            Steam tags: {creation.steamTags.join(", ")}
          </div>
        )}

        <div className="space-y-2">
          {categoryOrder.map((catId) => {
            const bucket = tagsByCategory.get(catId);
            if (!bucket || bucket.length === 0) return null;
            return (
              <div key={String(catId ?? "none")}>
                <div className="mb-1 text-xs uppercase tracking-wide text-foreground/40">
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
                            : "border-border bg-background text-foreground/60 hover:border-foreground/30",
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
            type="button"
            onClick={() => dispatch(approveCreation, "approve")}
            disabled={isPending}
            aria-busy={pendingAction === "approve"}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-60 disabled:cursor-wait"
          >
            {pendingAction === "approve" && <Spinner size="xs" />}
            {pendingAction === "approve" ? "Approving…" : "Approve"}
          </button>
          <input
            type="text"
            name="reason"
            ref={reasonRef}
            maxLength={300}
            placeholder={
              creation.communitySubmitted
                ? "Rejection reason (required — shown to the submitter)"
                : "Rejection reason (optional, shown to submitter)"
            }
            className={cn(
              "min-w-[220px] flex-1 rounded-md border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none",
              creation.communitySubmitted
                ? "border-purple-500/60 focus:border-purple-400"
                : "border-border focus:border-accent",
            )}
          />
          <button
            type="button"
            onClick={() => {
              if (creation.communitySubmitted) {
                const reason = reasonRef.current?.value.trim() ?? "";
                if (!reason) {
                  toast.error(
                    "This item was community-submitted — add a rejection reason first so the submitter knows why.",
                  );
                  reasonRef.current?.focus();
                  return;
                }
              }
              dispatch(rejectCreation, "reject");
            }}
            disabled={isPending}
            aria-busy={pendingAction === "reject"}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/70 hover:border-red-400 hover:text-red-300 disabled:opacity-60 disabled:cursor-wait"
          >
            {pendingAction === "reject" && <Spinner size="xs" />}
            {pendingAction === "reject" ? "Rejecting…" : "Reject"}
          </button>
          <button
            type="button"
            onClick={() => dispatch(saveCreationTags, "save")}
            disabled={isPending}
            aria-busy={pendingAction === "save"}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/70 hover:border-foreground/50 hover:text-foreground disabled:opacity-60 disabled:cursor-wait"
          >
            {pendingAction === "save" && <Spinner size="xs" />}
            {pendingAction === "save" ? "Saving…" : "Save edits"}
          </button>
        </div>
      </div>
    </form>
  );
}
