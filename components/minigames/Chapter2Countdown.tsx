"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

interface Props {
  /** Unix seconds of the announced Chapter 2 release, or null while no date
   *  has been announced — in which case every cell shows "??". */
  releaseUnix: number | null;
  /** Where the "it's out" state links to. */
  storeUrl: string;
}

interface Parts {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function splitRemaining(ms: number): Parts {
  // Same 30-day "month" bucket as the silence counter — a vibe, not a
  // calendar-accurate figure.
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600) % 24;
  const days = Math.floor(total / 86_400) % 30;
  const months = Math.floor(total / (86_400 * 30));
  return { months, days, hours, minutes, seconds, total };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Chapter2Countdown({ releaseUnix, storeUrl }: Props) {
  const { t } = useT();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    // No point ticking while there's no date to count toward.
    if (releaseUnix === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [releaseUnix]);

  // No date announced yet: render the timer fully "redacted" so it reads as an
  // armed-but-waiting countdown rather than an empty page.
  if (releaseUnix === null) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-card p-8 shadow-inner">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Cell display="??" label={t("minigames.silence.months")} />
          <Cell display="??" label={t("minigames.silence.days")} />
          <Cell display="??" label={t("minigames.silence.hours")} />
          <Cell display="??" label={t("minigames.silence.minutes")} />
          <Cell display="??" label={t("minigames.silence.seconds")} />
        </div>
        <p className="mt-5 text-center text-xs text-foreground/50">
          {t("minigames.chapter2.totalSeconds", { n: "?" })}
        </p>
      </div>
    );
  }

  const remainingMs = releaseUnix * 1000 - now;

  // Flip to the celebratory state the instant the clock crosses zero, no
  // reload needed.
  if (remainingMs <= 0) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-card p-8 text-center shadow-inner">
        <div className="text-5xl" aria-hidden>
          🎉
        </div>
        <h2 className="mt-3 text-2xl font-bold text-accent">
          {t("minigames.chapter2.releasedTitle")}
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          {t("minigames.chapter2.releasedBody")}
        </p>
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
        >
          {t("minigames.chapter2.releasedCta")} ↗
        </a>
      </div>
    );
  }

  const parts = splitRemaining(remainingMs);

  return (
    <div className="rounded-2xl border border-accent/30 bg-card p-8 shadow-inner">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Cell display={pad(parts.months)} label={t("minigames.silence.months")} />
        <Cell display={pad(parts.days)} label={t("minigames.silence.days")} />
        <Cell display={pad(parts.hours)} label={t("minigames.silence.hours")} />
        <Cell display={pad(parts.minutes)} label={t("minigames.silence.minutes")} />
        <Cell display={pad(parts.seconds)} label={t("minigames.silence.seconds")} />
      </div>
      <p className="mt-5 text-center text-xs text-foreground/50">
        {t("minigames.chapter2.totalSeconds", {
          n: parts.total.toLocaleString(),
        })}
      </p>
    </div>
  );
}

function Cell({ display, label }: { display: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-background/60 p-3">
      <span className="font-mono text-3xl font-bold tabular-nums text-accent sm:text-4xl">
        {display}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-foreground/50">
        {label}
      </span>
    </div>
  );
}
