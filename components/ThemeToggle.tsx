"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function ThemeToggle({ current }: { current: Theme }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;
  return (
    <form
      action="/api/prefs/theme"
      method="post"
      className="flex items-center gap-1 text-[11px] text-foreground/50"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <span className="hidden uppercase tracking-wider sm:inline">Theme:</span>
      <div
        role="group"
        aria-label="Colour theme"
        className="inline-flex overflow-hidden rounded border border-border bg-card/60"
      >
        {THEMES.map((t) => (
          <button
            key={t}
            type="submit"
            name="theme"
            value={t}
            data-pressed={t === current ? "true" : undefined}
            className={cn(
              "px-2 py-0.5 text-[11px] transition",
              t === current
                ? "bg-accent/20 text-accent"
                : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>
    </form>
  );
}
