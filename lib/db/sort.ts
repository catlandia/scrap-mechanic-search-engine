/**
 * Sort-mode vocabulary shared by server queries and client UI.
 *
 * These are plain constants with no database dependency, but they used to
 * live in `lib/db/queries.ts`. `components/SortSelector.tsx` is a client
 * component and imports them as *values*, so every browser bundle that
 * rendered a sort dropdown also pulled in the Drizzle client — and through
 * it the Postgres driver. That was survivable while the driver was Neon's
 * pure-`fetch` HTTP client; with postgres.js it broke the build outright on
 * `Can't resolve 'net'/'tls'`.
 *
 * Keep this module free of database imports.
 */

export const SORT_MODES = [
  "relevance",
  "newest",
  "oldest",
  "steam-newest",
  "steam-oldest",
  "popular",
  "unpopular",
  "favorites",
  "least-favorites",
  "rating",
  "least-rating",
  "site-rating",
  "site-least-rating",
] as const;

export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Record<SortMode, string> = {
  relevance: "Most relevant",
  newest: "Newest on site",
  oldest: "Oldest on site",
  "steam-newest": "Newest on Steam",
  "steam-oldest": "Oldest on Steam",
  popular: "Most subscribers (Steam)",
  unpopular: "Fewest subscribers (Steam)",
  favorites: "Most favourites (Steam)",
  "least-favorites": "Fewest favourites (Steam)",
  rating: "Highest rated (Steam)",
  "least-rating": "Lowest rated (Steam)",
  "site-rating": "Highest upvote score (Site)",
  "site-least-rating": "Lowest upvote score (Site)",
};

export function parseSortMode(raw: string | undefined | null): SortMode {
  if (raw && (SORT_MODES as readonly string[]).includes(raw)) return raw as SortMode;
  return "newest";
}
