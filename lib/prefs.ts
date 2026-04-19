export const RATING_MODES = ["steam", "site", "both"] as const;
export type RatingMode = (typeof RATING_MODES)[number];
export const DEFAULT_RATING_MODE: RatingMode = "both";

export const RATING_MODE_COOKIE = "smse_rating_mode";

export function parseRatingMode(raw: string | undefined): RatingMode {
  return (RATING_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as RatingMode)
    : DEFAULT_RATING_MODE;
}

export const THEMES = ["default", "workshop", "contrast"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "default";

export const THEME_COOKIE = "smse_theme";

export const THEME_LABELS: Record<Theme, string> = {
  default: "Default",
  workshop: "Workshop",
  contrast: "High contrast",
};

export function parseTheme(raw: string | undefined): Theme {
  return (THEMES as readonly string[]).includes(raw ?? "")
    ? (raw as Theme)
    : DEFAULT_THEME;
}
