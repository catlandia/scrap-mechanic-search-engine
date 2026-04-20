"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  startGame,
  submitGameAnswer,
  resetGame,
  type GameQuestion,
  type GameStats,
} from "./actions";
import { useT } from "@/lib/i18n/client";

type UIState =
  | { phase: "loading" }
  | {
      phase: "playing";
      q: GameQuestion;
      flash?: "correct" | "wrong" | "round";
    };

export default function ScrapchaGamePage() {
  const { t } = useT();
  const [state, setState] = useState<UIState>({ phase: "loading" });
  const [stats, setStats] = useState<GameStats>({
    streak: 0,
    bestStreak: 0,
    roundsWon: 0,
    correctTotal: 0,
    wrongTotal: 0,
  });
  const [isPending, startTransition] = useTransition();
  const [zoomed, setZoomed] = useState(false);
  const pendingTimers = useRef<number[]>([]);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startGame().then(({ question, stats }) => {
      setStats(stats);
      setState({ phase: "playing", q: question });
    });
  }, []);

  useEffect(() => {
    const timers = pendingTimers;
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  // Escape closes zoom; move focus for keyboard users.
  const wasZoomed = useRef(false);
  useEffect(() => {
    if (zoomed) {
      zoomCloseRef.current?.focus();
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setZoomed(false);
      }
      window.addEventListener("keydown", onKey);
      wasZoomed.current = true;
      return () => window.removeEventListener("keydown", onKey);
    } else if (wasZoomed.current) {
      zoomTriggerRef.current?.focus({ preventScroll: true });
      wasZoomed.current = false;
    }
  }, [zoomed]);

  function scheduleTimer(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      pendingTimers.current = pendingTimers.current.filter((x) => x !== id);
      fn();
    }, ms);
    pendingTimers.current.push(id);
  }

  function handleAnswer(answer: string) {
    if (isPending || state.phase !== "playing") return;
    const currentQ = state.q;
    startTransition(async () => {
      const result = await submitGameAnswer(answer);
      setStats(result.stats);

      if (result.status === "wrong") {
        setState({ phase: "playing", q: currentQ, flash: "wrong" });
        scheduleTimer(() => {
          setZoomed(false);
          setState({ phase: "playing", q: result.next });
        }, 900);
        return;
      }

      if (result.status === "round_complete") {
        setState({ phase: "playing", q: currentQ, flash: "round" });
        scheduleTimer(() => {
          setZoomed(false);
          setState({ phase: "playing", q: result.next });
        }, 700);
        return;
      }

      setState({ phase: "playing", q: currentQ, flash: "correct" });
      scheduleTimer(() => {
        setZoomed(false);
        setState({ phase: "playing", q: result.next });
      }, 420);
    });
  }

  function handleReset() {
    if (isPending) return;
    startTransition(async () => {
      const { stats } = await resetGame();
      setStats(stats);
      const { question } = await startGame();
      setState({ phase: "playing", q: question });
    });
  }

  if (state.phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-foreground/50">
        <p className="animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  const { q, flash } = state;
  const flashClass =
    flash === "correct"
      ? "ring-2 ring-green-400"
      : flash === "wrong"
        ? "ring-2 ring-red-500"
        : flash === "round"
          ? "ring-2 ring-accent"
          : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href="/minigames"
            className="text-xs text-foreground/60 hover:text-accent"
          >
            {t("minigames.backToIndex")}
          </Link>
          <h1 className="text-2xl font-bold">
            {t("minigames.scrapcha.name")}
          </h1>
          <p className="text-sm text-foreground/60">
            {t("minigames.scrapcha.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1 text-xs text-foreground/60 hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {t("minigames.reset")}
        </button>
      </header>

      <section
        aria-label={t("minigames.statsLabel")}
        className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-card/60 p-3 text-center text-xs"
      >
        <Stat label={t("minigames.stat.streak")} value={stats.streak} highlight />
        <Stat label={t("minigames.stat.bestStreak")} value={stats.bestStreak} />
        <Stat label={t("minigames.stat.rounds")} value={stats.roundsWon} />
        <Stat
          label={t("minigames.stat.accuracy")}
          value={
            stats.correctTotal + stats.wrongTotal === 0
              ? "—"
              : `${Math.round(
                  (stats.correctTotal /
                    (stats.correctTotal + stats.wrongTotal)) *
                    100,
                )}%`
          }
        />
      </section>

      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: q.roundTotal }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-10 rounded-full transition-colors ${
              i + 1 < q.questionNumber
                ? "bg-accent"
                : i + 1 === q.questionNumber
                  ? "bg-accent/60"
                  : "bg-foreground/10"
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-foreground/40">
          {q.questionNumber}/{q.roundTotal}
        </span>
      </div>

      <button
        ref={zoomTriggerRef}
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={t("minigames.zoomAria")}
        className={`group relative block w-full overflow-hidden rounded-xl border border-foreground/10 bg-black/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${flashClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={q.nonce}
          src={`/api/minigames/scrapcha/image?n=${q.nonce}`}
          alt={t("minigames.whoIsThis")}
          className="mx-auto block h-auto w-full max-h-[60vh] object-contain"
          draggable={false}
        />
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white shadow-sm">
          {t("minigames.zoomHint")}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={isPending || !!flash}
            className="rounded-lg border border-foreground/10 bg-card px-4 py-3 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>

      {flash === "wrong" && (
        <p
          role="status"
          aria-live="polite"
          className="animate-pulse text-center text-sm text-red-400"
        >
          {t("minigames.wrongReset")}
        </p>
      )}
      {flash === "round" && (
        <p
          role="status"
          aria-live="polite"
          className="text-center text-sm text-accent"
        >
          {t("minigames.roundWon")}
        </p>
      )}

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("minigames.zoomDialogLabel")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            ref={zoomCloseRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            aria-label={t("common.close")}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/minigames/scrapcha/image?n=${q.nonce}`}
            alt={t("minigames.whoIsThis")}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
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
