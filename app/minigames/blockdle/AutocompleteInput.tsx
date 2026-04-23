"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INDEX } from "@/lib/blockdle/autocomplete.generated";
import type { AutocompleteEntry } from "@/lib/blockdle/types";

type Props = {
  onSubmit: (name: string) => void;
  disabled?: boolean;
  placeholder: string;
  submitLabel: string;
  excludeNames?: ReadonlySet<string>;
};

const MAX_SUGGESTIONS = 8;

// Collapse whitespace + punctuation so "craft bot" and "craft-bot" both
// match "Craftbot". Keeps alphanumerics only.
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Client-side prefix + substring match over the slim INDEX. Matches are
// attempted against the raw lowercase name first (preserves spelling
// hints) and then against the whitespace-stripped form so common typos
// like "craft bot" vs "Craftbot" still land. Prefix ranks above
// substring; alphabetical tie-break. `excludeNames` is lower-case.
function filter(query: string, exclude: ReadonlySet<string>): AutocompleteEntry[] {
  const qRaw = query.trim().toLowerCase();
  if (!qRaw) return [];
  const qNorm = normalise(qRaw);
  const prefix: AutocompleteEntry[] = [];
  const substring: AutocompleteEntry[] = [];
  for (const e of INDEX) {
    if (exclude.has(e.nameLower)) continue;
    const nameNorm = normalise(e.nameLower);
    if (e.nameLower.startsWith(qRaw) || nameNorm.startsWith(qNorm)) {
      prefix.push(e);
    } else if (e.nameLower.includes(qRaw) || nameNorm.includes(qNorm)) {
      substring.push(e);
    }
    if (prefix.length >= MAX_SUGGESTIONS) break;
  }
  return [...prefix, ...substring].slice(0, MAX_SUGGESTIONS);
}

export function AutocompleteInput({
  onSubmit,
  disabled,
  placeholder,
  submitLabel,
  excludeNames,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => filter(query, excludeNames ?? new Set<string>()),
    [query, excludeNames],
  );

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  function submit(name: string) {
    if (disabled) return;
    const clean = name.trim();
    if (!clean) return;
    onSubmit(clean);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[active]) {
        submit(suggestions[active].name);
      } else {
        submit(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="blockdle-ac-listbox"
          aria-autocomplete="list"
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => submit(query)}
          disabled={disabled || !query.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="blockdle-ac-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.uuid}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(s.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${
                i === active
                  ? "bg-accent/15 text-accent"
                  : "text-foreground/80 hover:bg-accent/5"
              }`}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
