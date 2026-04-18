export const RATING_MODES = ["steam", "site", "both"] as const;
export type RatingMode = (typeof RATING_MODES)[number];
export const DEFAULT_RATING_MODE: RatingMode = "both";

export const RATING_MODE_COOKIE = "smse_rating_mode";

export function parseRatingMode(raw: string | undefined): RatingMode {
  return (RATING_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as RatingMode)
    : DEFAULT_RATING_MODE;
}
