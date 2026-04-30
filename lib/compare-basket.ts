// Browser-only helpers for the "Compare basket" — the small floating bar
// that lets a visitor accumulate 2-4 creations and jump to /compare?ids=…
// State lives in localStorage so it persists across pages without needing
// a server round-trip on every navigation. Components subscribe to changes
// via the smse:compare-changed window event so the toggle button on a
// creation page and the floating bar in the layout stay in sync without
// shared React state.

export const COMPARE_KEY = "smse_compare";
export const COMPARE_EVENT = "smse:compare-changed";
export const COMPARE_MAX = 4;

export function readCompareBasket(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

export function writeCompareBasket(ids: string[]): void {
  if (typeof window === "undefined") return;
  const trimmed = ids.slice(0, COMPARE_MAX);
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(COMPARE_EVENT, { detail: trimmed }));
}

export function toggleCompare(id: string): string[] {
  const current = readCompareBasket();
  if (current.includes(id)) {
    const next = current.filter((x) => x !== id);
    writeCompareBasket(next);
    return next;
  }
  // Cap behaviour: drop the oldest entry if we'd exceed the cap. Visitors
  // are unlikely to compare more than 4 at a time and this beats a silent
  // "your click did nothing" outcome.
  const next =
    current.length >= COMPARE_MAX
      ? [...current.slice(1), id]
      : [...current, id];
  writeCompareBasket(next);
  return next;
}

export function clearCompareBasket(): void {
  writeCompareBasket([]);
}
