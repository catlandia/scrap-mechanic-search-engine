"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "smse_beta_dismissed_v1";

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
          Beta
        </span>
        <span className="text-foreground/70">
          This site is still in testing. Expect rough edges and occasional
          data changes.
        </span>
        <Link
          href="/guide"
          className="text-amber-200 underline underline-offset-2 hover:text-foreground"
        >
          Quick guide →
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
