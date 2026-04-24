"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

interface Props {
  /** Unix seconds of the latest SM Steam news item. */
  sinceUnix: number;
}

interface Parts {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function splitElapsed(ms: number): Parts {
  // "Month" here is a rough 30-day bucket — the point is a vibe, not a
  // calendar-accurate count. If someone asks why "3 months" says 90 days,
  // that's why.
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600) % 24;
  const days = Math.floor(total / 86_400) % 30;
  const months = Math.floor(total / (86_400 * 30));
  return { months, days, hours, minutes, seconds, total };
}

export function SilenceCounter({ sinceUnix }: Props) {
  const { t } = useT();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = splitElapsed(now - sinceUnix * 1000);

  return (
    <div className="rounded-2xl border border-accent/30 bg-card p-8 shadow-inner">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Cell value={parts.months} label={t("minigames.silence.months")} />
        <Cell value={parts.days} label={t("minigames.silence.days")} />
        <Cell value={parts.hours} label={t("minigames.silence.hours")} />
        <Cell value={parts.minutes} label={t("minigames.silence.minutes")} />
        <Cell value={parts.seconds} label={t("minigames.silence.seconds")} />
      </div>
      <p className="mt-5 text-center text-xs text-foreground/50">
        {t("minigames.silence.totalSeconds", {
          n: parts.total.toLocaleString(),
        })}
      </p>
    </div>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-background/60 p-3">
      <span className="font-mono text-3xl font-bold tabular-nums text-accent sm:text-4xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-foreground/50">
        {label}
      </span>
    </div>
  );
}
