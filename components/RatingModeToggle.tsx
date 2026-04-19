"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { RATING_MODES, type RatingMode } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const LABELS: Record<RatingMode, string> = {
  steam: "Steam",
  site: "Site",
  both: "Both",
};

// Routes that actually render creation ratings. Anywhere else the toggle is
// chrome that changes nothing the visitor can see — we hide it to stop the
// top bar from advertising a control the current screen doesn't respond to.
// `/settings` is intentionally absent: the settings page passes `alwaysShow`.
const KIND_SLUGS = [
  "blueprints",
  "mods",
  "worlds",
  "challenges",
  "tiles",
  "custom-games",
  "terrain",
  "other",
] as const;

function pathHasRatings(pathname: string): boolean {
  if (pathname === "/" || pathname === "/new") return true;
  if (pathname.startsWith("/search")) return true;
  if (pathname.startsWith("/creation/")) return true;
  if (pathname.startsWith("/author/")) return true;
  if (pathname.startsWith("/me/favourites")) return true;
  const first = pathname.split("/")[1] ?? "";
  return (KIND_SLUGS as readonly string[]).includes(first);
}

export function RatingModeToggle({
  current,
  alwaysShow = false,
}: {
  current: RatingMode;
  /** Set on pages that configure the toggle (settings, mobile drawer) so
   *  it renders regardless of whether the current route displays ratings. */
  alwaysShow?: boolean;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;

  if (!alwaysShow && !pathHasRatings(pathname)) return null;

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
