"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_LABELS, SORT_MODES, type SortMode } from "@/lib/db/queries";

export function SortSelector({
  current,
  label = "Sort",
}: {
  current: SortMode;
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hasQuery = Boolean(searchParams.get("q")?.trim());
  const defaultSort: SortMode = hasQuery ? "relevance" : "newest";
  // Relevance is only meaningful when there's a text query — hide it otherwise
  // so the dropdown can't land you on a sort mode that falls back to newest.
  const visibleModes = SORT_MODES.filter((m) => m !== "relevance" || hasQuery);

  function setSort(value: SortMode) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === defaultSort) {
      next.delete("sort");
    } else {
      next.set("sort", value);
    }
    next.delete("page");
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-foreground/60">
      {label}
      <select
        value={current}
        onChange={(e) => setSort(e.target.value as SortMode)}
        className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
      >
        {visibleModes.map((m) => (
          <option key={m} value={m}>
            {SORT_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );
}
