"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { buildShareGrid } from "@/lib/blockdle/share";
import { ATTEMPTS_MAX } from "@/lib/blockdle/types";
import { AutocompleteInput } from "./AutocompleteInput";
import { EmptyGuessRow, GuessRow, GuessRowHeader } from "./GuessRow";
import {
  clearEndlessStats,
  resetBlockdle,
  startBlockdle,
  submitBlockdleGuess,
  type BlockdleView,
  type Mode,
} from "./actions";

type Props = { mode: Mode };

export function BlockdleGame({ mode }: Props) {
  const { t } = useT();
  const [view, setView] = useState<BlockdleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareFlash, setShareFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startBlockdle(mode).then(setView);
  }, [mode]);

  const excludeNames = useMemo(() => {
    const s = new Set<string>();
    if (view) for (const g of view.guesses) s.add(g.guessName.toLowerCase());
    return s;
  }, [view]);

  function onGuess(name: string) {
    if (!view || view.status !== "playing" || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitBlockdleGuess(mode, name);
      if (!result.ok) {
        if (result.reason === "unknown_block") {
          setError(t("minigames.blockdle.error.unknownBlock"));
        } else if (result.reason === "duplicate_guess") {
          setError(t("minigames.blockdle.error.duplicate"));
        }
        return;
      }
      setView(result.view);
    });
  }

  function onResetEndless() {
    if (isPending) return;
    startTransition(async () => {
      const next = await resetBlockdle("endless");
      setView(next);
      setError(null);
    });
  }

  function onClearEndlessStats() {
    if (isPending) return;
    startTransition(async () => {
      const next = await clearEndlessStats();
      setView(next);
      setError(null);
    });
  }

  function onShare() {
    if (!view || view.mode !== "daily" || view.status === "playing") return;
    const grid = buildShareGrid({
      dateIsoUtc: view.dateIsoUtc ?? "",
      guesses: view.guesses,
      won: view.status === "won",
      siteUrl: typeof window !== "undefined" ? `${window.location.origin}/minigames/blockdle` : undefined,
    });
    navigator.clipboard.writeText(grid).then(() => {
      setShareFlash(true);
      window.setTimeout(() => setShareFlash(false), 1500);
    });
  }

  if (!view) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-foreground/50">
        <p className="animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  const labels = {
    icon: t("minigames.blockdle.col.icon"),
    name: t("minigames.blockdle.col.name"),
    category: t("minigames.blockdle.col.category"),
    material: t("minigames.blockdle.col.material"),
    durability: t("minigames.blockdle.col.durability"),
    density: t("minigames.blockdle.col.density"),
    friction: t("minigames.blockdle.col.friction"),
    buoyancy: t("minigames.blockdle.col.buoyancy"),
  };

  const attemptsUsed = view.guesses.length;
  const attemptsLeft = ATTEMPTS_MAX - attemptsUsed;
  const playing = view.status === "playing";
  const emptyRowsCount = Math.max(0, ATTEMPTS_MAX - attemptsUsed);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href="/minigames"
            className="text-xs text-foreground/60 hover:text-accent"
          >
            {t("minigames.backToIndex")}
          </Link>
          <h1 className="text-2xl font-bold">{t("minigames.blockdle.name")}</h1>
          <p className="text-sm text-foreground/60">
            {t("minigames.blockdle.subtitle")}
          </p>
        </div>
        <ModeSwitcher current={mode} />
      </header>

      {mode === "endless" && view.stats && (
        <section
          aria-label={t("minigames.statsLabel")}
          className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-card/60 p-3 text-center text-xs"
        >
          <Stat label={t("minigames.stat.streak")} value={view.stats.streak} highlight />
          <Stat label={t("minigames.stat.bestStreak")} value={view.stats.bestStreak} />
          <Stat label={t("minigames.blockdle.stat.wins")} value={view.stats.wins} />
          <Stat label={t("minigames.blockdle.stat.losses")} value={view.stats.losses} />
        </section>
      )}

      <div className="space-y-2">
        <GuessRowHeader labels={labels} />
        <div className="space-y-1.5">
          {view.guesses.map((g, i) => (
            <GuessRow key={i} guess={g} />
          ))}
          {Array.from({ length: emptyRowsCount }).map((_, i) => (
            <EmptyGuessRow key={`empty-${i}`} />
          ))}
        </div>
      </div>

      {playing && (
        <div className="space-y-1.5">
          <AutocompleteInput
            onSubmit={onGuess}
            disabled={isPending}
            placeholder={t("minigames.blockdle.inputPlaceholder")}
            submitLabel={t("minigames.blockdle.submit")}
            excludeNames={excludeNames}
          />
          <div className="flex items-baseline justify-between text-[11px] text-foreground/50">
            <span>
              {t("minigames.blockdle.attemptsRemaining", { n: attemptsLeft })}
            </span>
            {error && (
              <span role="status" className="text-red-300">
                {error}
              </span>
            )}
          </div>
        </div>
      )}

      {!playing && view.answer && (
        <RevealPanel
          view={view}
          onShare={onShare}
          shareFlash={shareFlash}
          onNextEndless={onResetEndless}
          onResetStats={onClearEndlessStats}
        />
      )}
    </div>
  );
}

function ModeSwitcher({ current }: { current: Mode }) {
  const { t } = useT();
  const pillClass = (active: boolean) =>
    `rounded-md border px-3 py-1 text-xs transition-colors ${
      active
        ? "border-accent bg-accent/15 text-accent"
        : "border-border text-foreground/60 hover:border-accent hover:text-accent"
    }`;
  return (
    <nav className="flex gap-2" aria-label="Mode">
      <Link
        href="/minigames/blockdle?mode=daily"
        aria-current={current === "daily" ? "page" : undefined}
        className={pillClass(current === "daily")}
      >
        {t("minigames.blockdle.mode.daily")}
      </Link>
      <Link
        href="/minigames/blockdle?mode=endless"
        aria-current={current === "endless" ? "page" : undefined}
        className={pillClass(current === "endless")}
      >
        {t("minigames.blockdle.mode.endless")}
      </Link>
    </nav>
  );
}

function RevealPanel({
  view,
  onShare,
  shareFlash,
  onNextEndless,
  onResetStats,
}: {
  view: BlockdleView;
  onShare: () => void;
  shareFlash: boolean;
  onNextEndless: () => void;
  onResetStats: () => void;
}) {
  const { t } = useT();
  const won = view.status === "won";
  const title = won
    ? t("minigames.blockdle.win.title")
    : t("minigames.blockdle.lose.title");
  const body = won
    ? t("minigames.blockdle.win.body", {
        n: view.guesses.length,
        max: view.attemptsMax,
      })
    : t("minigames.blockdle.lose.body", { name: view.answer?.title ?? "" });
  return (
    <section
      className={`rounded-lg border px-4 py-4 ${
        won
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-red-500/40 bg-red-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {view.answer && (
          <Image
            src={`/api/minigames/blockdle/icon/${view.answer.uuid}`}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 rounded border border-border bg-black/40 object-contain"
          />
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-foreground/70">{body}</p>
          {view.answer && (
            <p className="mt-1 text-xs text-foreground/50">
              {t("minigames.blockdle.reveal.label")}:{" "}
              <span className="font-medium text-foreground/80">
                {view.answer.title}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {view.mode === "daily" && (
          <>
            <button
              type="button"
              onClick={onShare}
              className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
            >
              {t("minigames.blockdle.share.button")}
            </button>
            {shareFlash && (
              <span className="text-xs text-emerald-300">
                {t("minigames.blockdle.share.copied")}
              </span>
            )}
            <Link
              href="/minigames/blockdle?mode=endless"
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/70 hover:border-accent hover:text-accent"
            >
              {t("minigames.blockdle.daily.cta.endless")}
            </Link>
            <span className="text-xs text-foreground/50">
              {t("minigames.blockdle.daily.cta.tomorrow")}
            </span>
          </>
        )}
        {view.mode === "endless" && (
          <>
            <button
              type="button"
              onClick={onNextEndless}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-black hover:bg-accent-strong"
            >
              {t("minigames.blockdle.endless.cta.next")}
            </button>
            <button
              type="button"
              onClick={onResetStats}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/60 hover:border-red-500 hover:text-red-300"
            >
              {t("minigames.reset")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div
        className={`text-base font-semibold tabular-nums ${highlight ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-foreground/40">
        {label}
      </div>
    </div>
  );
}
