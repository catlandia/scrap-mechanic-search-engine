"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TagSuggestion {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  usage: number;
}

/**
 * Debounced tag autocomplete. Hits /api/tags/search and shows a dropdown
 * sorted by usage count (most popular first). Exclusion list filters out
 * tags the caller already considers "present".
 */
export function TagAutocomplete({
  placeholder = "Search tags…",
  excludeSlugs = [],
  onSelect,
  disabled = false,
  className,
  autoFocus = false,
}: {
  placeholder?: string;
  excludeSlugs?: string[];
  onSelect: (tag: TagSuggestion) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const excluded = new Set(excludeSlugs);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const q = query.trim();
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tags/search?q=${encodeURIComponent(q)}&limit=10`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { tags: TagSuggestion[] };
        const filtered = (data.tags ?? []).filter((t) => !excluded.has(t.slug));
        setSuggestions(filtered);
        setActiveIndex(0);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(handle);
    // Deliberately exclude excluded so typing doesn't refetch on prop churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function choose(tag: TagSuggestion) {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    await onSelect(tag);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const pick = suggestions[activeIndex];
      if (pick) {
        e.preventDefault();
        void choose(pick);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
      />
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-black/95 shadow-xl backdrop-blur">
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-white/40">Searching…</div>
          )}
          {suggestions.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(t);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition",
                i === activeIndex
                  ? "bg-accent/20 text-accent"
                  : "text-white/80 hover:bg-white/5",
              )}
            >
              <span>{t.name}</span>
              <span className="text-[10px] text-white/40">
                {t.usage.toLocaleString()}
                {t.usage === 1 ? " use" : " uses"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
