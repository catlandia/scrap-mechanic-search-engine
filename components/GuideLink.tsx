"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const GUIDE_SEEN_KEY = "smse_guide_seen_v1";

export function GuideLink() {
  // Start `highlight=false` so the first server/client render agrees and we
  // don't show a yellow flash to people who've already seen it.
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
      if (!seen) setHighlight(true);
    } catch {
      setHighlight(true);
    }
  }, []);

  function markSeen() {
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      // storage blocked — pulse will persist, but the link still works
    }
    setHighlight(false);
  }

  return (
    <Link
      href="/guide"
      onClick={markSeen}
      aria-label={highlight ? "New here? Read the quick guide" : "Quick guide"}
      className={
        highlight
          ? "relative hidden items-center gap-1.5 rounded-md border border-accent/60 bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent shadow-[0_0_12px_-2px_rgba(251,191,36,0.4)] hover:bg-accent/25 sm:inline-flex"
          : "hidden items-center rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-foreground/70 hover:border-foreground/15 hover:text-foreground sm:inline-flex"
      }
    >
      <span aria-hidden="true">?</span>
      <span>Guide</span>
      {highlight && (
        <span
          aria-hidden="true"
          className="ml-0.5 size-2 rounded-full bg-accent animate-pulse"
        />
      )}
    </Link>
  );
}
