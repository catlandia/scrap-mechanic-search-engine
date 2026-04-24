"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function FunModeToggle({ current }: { current: boolean }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;

  return (
    <form
      action="/api/prefs/fun-mode"
      method="post"
      className="flex items-center gap-2 text-sm"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <div
        role="group"
        aria-label="Fun Mode"
        className="inline-flex overflow-hidden rounded border border-border bg-card/60"
      >
        <button
          type="submit"
          name="on"
          value="0"
          data-pressed={!current ? "true" : undefined}
          className={cn(
            "px-3 py-1 text-xs transition",
            !current
              ? "bg-accent/20 text-accent"
              : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          Off
        </button>
        <button
          type="submit"
          name="on"
          value="1"
          data-pressed={current ? "true" : undefined}
          className={cn(
            "px-3 py-1 text-xs transition",
            current
              ? "bg-accent/20 text-accent"
              : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          On
        </button>
      </div>
      <span className="text-xs text-foreground/60">
        {current ? "Sounds + pranks are on." : "Silent, no pranks."}
      </span>
    </form>
  );
}
