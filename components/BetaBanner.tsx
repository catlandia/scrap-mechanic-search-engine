"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Bump the version suffix whenever banner copy meaningfully changes — a new
// key re-shows the banner to users who dismissed the previous message.
const DISMISS_KEY = "smse_beta_dismissed_v2";

export function BetaBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      setHidden(dismissed);
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage blocked — banner will just reappear next visit
    }
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-500/30 bg-amber-500/10 text-amber-100"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs sm:text-sm">
        <span className="font-semibold uppercase tracking-wider text-amber-300">
          Beta 2.0
        </span>
        <span className="text-foreground/70">
          <span className="font-semibold text-amber-200">New:</span>{" "}
          comment threads &amp; votes, profile walls, creators directory,
          badges, prefix search, simpler nav. Rough edges remain — keep the
          feedback coming.
        </span>
        <Link
          href="/about"
          className="text-amber-200 underline underline-offset-2 hover:text-foreground"
        >
          How it works →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss beta notice"
          className="ml-auto rounded px-1 text-foreground/60 hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
