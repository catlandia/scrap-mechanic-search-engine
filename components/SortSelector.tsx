"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_LABELS, SORT_MODES, type SortMode } from "@/lib/db/queries";

const DEFAULT_SORT: SortMode = "newest";

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

  function setSort(value: SortMode) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === DEFAULT_SORT) {
      next.delete("sort");
    } else {
      next.set("sort", value);
    }
    next.delete("page");
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-white/60">
      {label}
      <select
        value={current}
        onChange={(e) => setSort(e.target.value as SortMode)}
        className="rounded border border-border bg-background px-2 py-1 text-sm text-white focus:border-accent focus:outline-none"
      >
        {SORT_MODES.map((m) => (
          <option key={m} value={m}>
            {SORT_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );
}
