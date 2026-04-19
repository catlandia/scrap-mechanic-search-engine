"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/**
 * Theme picker pill. Deliberately uses hardcoded Tailwind palette colours
 * (zinc / amber) instead of theme tokens so it stays readable even when
 * the user has saved a custom theme where every token is the same colour.
 * This is the fail-safe that lets them switch back to Default.
 */
export function ThemeToggle({ current }: { current: Theme }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;
  return (
    <form
      action="/api/prefs/theme"
      method="post"
      className="flex items-center gap-1 text-[11px] text-zinc-300"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <span className="hidden uppercase tracking-wider sm:inline">Theme:</span>
      <div
        role="group"
        aria-label="Colour theme"
        className="inline-flex overflow-hidden rounded border border-zinc-700 bg-zinc-900"
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
                ? "bg-amber-500 text-black"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
            )}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>
    </form>
  );
}
