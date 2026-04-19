"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { RATING_MODES, type RatingMode } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const LABELS: Record<RatingMode, string> = {
  steam: "Steam",
  site: "Site",
  both: "Both",
};

export function RatingModeToggle({ current }: { current: RatingMode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;
  return (
    <form
      action="/api/prefs/rating-mode"
      method="post"
      className="flex items-center gap-1 text-[11px] text-foreground/50"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <span className="hidden uppercase tracking-wider sm:inline">Ratings:</span>
      <div
        role="group"
        aria-label="Rating display"
        className="inline-flex overflow-hidden rounded border border-border bg-card/60"
      >
        {RATING_MODES.map((m) => (
          <button
            key={m}
            type="submit"
            name="mode"
            value={m}
            data-pressed={m === current ? "true" : undefined}
            className={cn(
              "px-2 py-0.5 text-[11px] transition",
              m === current
                ? "bg-accent/20 text-accent"
                : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
    </form>
  );
}
