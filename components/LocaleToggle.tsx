"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NATIVE_NAMES, type Locale } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function LocaleToggle({ current }: { current: Locale }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;
  return (
    <form
      action="/api/prefs/locale"
      method="post"
      className="flex items-center gap-1 text-[11px] text-zinc-300"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <span className="hidden uppercase tracking-wider sm:inline">Lang:</span>
      <div
        role="group"
        aria-label="Language"
        className="inline-flex overflow-hidden rounded border border-zinc-700 bg-zinc-900"
      >
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="submit"
            name="locale"
            value={loc}
            data-pressed={loc === current ? "true" : undefined}
            className={cn(
              "px-2 py-0.5 text-[11px] uppercase transition",
              loc === current
                ? "bg-amber-500 text-black"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
            )}
            title={LOCALE_NATIVE_NAMES[loc]}
          >
            {loc}
          </button>
        ))}
      </div>
    </form>
  );
}
