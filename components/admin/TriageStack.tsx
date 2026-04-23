"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { quickApprove, rejectCreation } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

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

export interface TriageCard {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  steamUrl: string;
  kind: string;
  subscriptions: number;
  favorites: number;
  voteScore: number | null;
  authorName: string | null;
  steamTags: string[];
  tags: { id: number; name: string }[];
  communitySubmitted: boolean;
}

type ExitDirection = "approve" | "reject" | "skip" | null;
type CardRole = "current" | "next";

const SWIPE_THRESHOLD = 120;
const ANIM_MS = 280;

export function TriageStack({
  cards,
  totalPending,
}: {
  cards: TriageCard[];
  totalPending: number;
}) {
  const router = useRouter();
  // Snapshot the cards prop on mount. Keep progressing through the buffer
  // and only accept a replacement batch when the current one is exhausted —
  // this way a server-action re-render can't shuffle the stack mid-animation.
  const [buffer, setBuffer] = useState<TriageCard[]>(() => cards);
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<ExitDirection>(null);
  const [drag, setDrag] = useState(0);
  const [isPending, startTransition] = useTransition();
  const dragStart = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (index >= buffer.length || buffer.length === 0) {
      setBuffer(cards);
      setIndex(0);
    }
    // Only react to cards prop changes; ignore our own setIndex updates here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const current = buffer[index];
  const next = buffer[index + 1];
  const remaining = Math.max(0, buffer.length - index);

  const act = useCallback(
    (action: Exclude<ExitDirection, null>) => {
      if (!current || busy.current) return;
      busy.current = true;
      setDrag(0);
      setExit(action);

      const advance = () => {
        setExit(null);
        setIndex((i) => i + 1);
        busy.current = false;
      };

      if (action === "skip") {
        window.setTimeout(advance, ANIM_MS);
        return;
      }

      const fd = new FormData();
      fd.append("creationId", current.id);
      startTransition(async () => {
        try {
          if (action === "approve") await quickApprove(fd);
          else await rejectCreation(fd);
        } catch (err) {
          console.error(err);
        }
        window.setTimeout(advance, ANIM_MS);
      });
    },
    [current],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        act("reject");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        act("approve");
      } else if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        act("skip");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  useEffect(() => {
    if (buffer.length > 0 && index >= buffer.length) {
      router.refresh();
    }
  }, [index, buffer.length, router]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy.current) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragStart.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current == null) return;
    setDrag(e.clientX - dragStart.current);
  }
  function onPointerUp() {
    if (dragStart.current == null) return;
    const dx = drag;
    dragStart.current = null;
    if (dx > SWIPE_THRESHOLD) act("approve");
    else if (dx < -SWIPE_THRESHOLD) act("reject");
    else setDrag(0);
  }

  if (buffer.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card p-8 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold">Queue is clear.</h1>
        <p className="text-foreground/60">
          No pending creations right now. Run an ingest from{" "}
          <Link href="/admin/ingest" className="text-accent hover:underline">
            /admin/ingest
          </Link>
          .
        </p>
      </div>
    );
  }

  if (index >= buffer.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-foreground/60">
        Loading next batch…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Triage</h1>
          <p className="text-xs text-foreground/50">
            Approve pushes the item to the public site without tagging.
            Untagged items land in{" "}
            <Link href="/admin/queue" className="text-accent hover:underline">
              /admin/queue
            </Link>
            {" "}until admin confirms a tag or the community votes one over
            +3.
          </p>
        </div>
        <div className="text-sm text-foreground/60">
          <span className="font-medium text-foreground">{remaining}</span> of{" "}
          {totalPending} in this batch
        </div>
      </header>

      {/* Stack needs its own relative positioning context so the absolutely
          positioned cards land on top of each other. Min-height is generous
          so the short-description placeholder still looks intentional on
          sparse items, but the card itself can grow past this via the
          intrinsic height of its content. */}
      <div className="relative min-h-[calc(100vh-220px)]">
        {next && (
          <TriageCardView
            key={next.id}
            card={next}
            role="next"
            rising={exit !== null}
          />
        )}
        {current && (
          <TriageCardView
            key={current.id}
            card={current}
            role="current"
            exit={exit}
            drag={drag}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        )}
      </div>

      <footer className="sticky bottom-4 mt-5 flex items-center justify-center gap-4">
        <ActionButton
          label="Reject"
          shortcut="←"
          variant="reject"
          disabled={isPending}
          onClick={() => act("reject")}
        />
        <ActionButton
          label="Skip"
          shortcut="Space"
          variant="skip"
          disabled={isPending}
          onClick={() => act("skip")}
        />
        <ActionButton
          label="Approve"
          shortcut="→"
          variant="approve"
          disabled={isPending}
          onClick={() => act("approve")}
        />
      </footer>
    </div>
  );
}

interface CardViewProps {
  card: TriageCard;
  role: CardRole;
  exit?: ExitDirection;
  drag?: number;
  rising?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function TriageCardView({
  card,
  role,
  exit,
  drag = 0,
  rising = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: CardViewProps) {
  const kindLabel = KIND_LABELS[card.kind] ?? card.kind;

  let transform = "none";
  let transition = `transform ${ANIM_MS}ms ease-out, opacity ${ANIM_MS}ms ease-out`;
  let opacity = 1;

  if (role === "current") {
    if (exit === "approve") {
      transform = "translateX(120vw) rotate(14deg)";
      opacity = 0;
    } else if (exit === "reject") {
      transform = "translateX(-120vw) rotate(-14deg)";
      opacity = 0;
    } else if (exit === "skip") {
      transform = "translateY(-25vh) scale(0.92)";
      opacity = 0;
    } else if (drag !== 0) {
      const rot = Math.max(-14, Math.min(14, drag / 14));
      transform = `translateX(${drag}px) rotate(${rot}deg)`;
      transition = "none";
    }
  } else {
    // role === "next": sits slightly scaled-down behind the current card.
    // When an exit is in flight, rise to the current card's resting transform so
    // the swap after the animation is seamless.
    if (rising) {
      transform = "none";
      opacity = 1;
    } else {
      transform = "scale(0.96) translateY(8px)";
      opacity = 0.85;
    }
  }

  const approveVisible = role === "current" && drag > 40;
  const rejectVisible = role === "current" && drag < -40;

  // `current` flows normally so the card stretches vertically to fit the
  // full description — moderators wanted to read pending items without an
  // in-card scroll. `next` is absolute inset-0 behind current so it auto-
  // matches current's bounding box without needing a hard-coded height.
  const positioning =
    role === "current"
      ? "relative select-none touch-pan-y"
      : "pointer-events-none absolute inset-0 select-none";
  return (
    <div
      className={cn(positioning)}
      style={{
        transform,
        transition,
        opacity,
        willChange: "transform, opacity",
        zIndex: role === "current" ? 2 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="relative aspect-video w-full bg-black">
          {card.thumbnailUrl ? (
            <Image
              src={card.thumbnailUrl}
              alt={card.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority={role === "current"}
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">
              no thumbnail
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs uppercase tracking-wider text-white/90">
            {kindLabel}
          </span>
          <div
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-1 text-xl font-bold uppercase tracking-wider text-red-300 transition",
              rejectVisible ? "opacity-100" : "opacity-0",
            )}
          >
            Reject
          </div>
          <div
            className={cn(
              "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border-2 border-emerald-400 bg-emerald-500/20 px-3 py-1 text-xl font-bold uppercase tracking-wider text-emerald-300 transition",
              approveVisible ? "opacity-100" : "opacity-0",
            )}
          >
            Approve
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold">{card.title}</h2>
                {card.communitySubmitted && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-purple-500/50 bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-200"
                    title="A community member submitted this creation via /submit — treat the review note carefully."
                  >
                    <span aria-hidden>👥</span>
                    Community submitted
                  </span>
                )}
              </div>
              <div className="text-xs text-foreground/50">
                {card.authorName ? `by ${card.authorName} · ` : ""}
                {card.subscriptions.toLocaleString()} subs ·{" "}
                {card.favorites.toLocaleString()} favs
                {card.voteScore != null &&
                  ` · ${Math.round(card.voteScore * 100)}%`}
              </div>
            </div>
            <a
              href={card.steamUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-border px-2 py-1 text-xs text-foreground/60 hover:border-accent hover:text-accent"
            >
              Steam ↗
            </a>
          </div>

          {card.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs text-accent"
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-foreground/40">
              no auto-tags — consider rejecting or opening in /admin/queue to tag manually
            </div>
          )}

          <div className="mt-1 border-t border-border pt-3">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-foreground/40">
              Description
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
              {card.description || "(no description)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  shortcut,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  variant: "reject" | "skip" | "approve";
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles =
    variant === "approve"
      ? "bg-emerald-500 text-black hover:bg-emerald-400"
      : variant === "reject"
        ? "bg-red-500 text-foreground hover:bg-red-400"
        : "bg-foreground/10 text-foreground/80 hover:bg-foreground/20";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-[110px] flex-col items-center gap-0.5 rounded-lg px-5 py-2.5 font-medium transition disabled:opacity-50",
        styles,
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-70">{shortcut}</span>
    </button>
  );
}
