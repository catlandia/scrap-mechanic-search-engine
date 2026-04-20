export const LOCALES = ["en", "ru", "de", "pl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "smse_lang";

// Native names so the language picker reads naturally to speakers of each one,
// regardless of which locale the surrounding UI is currently in.
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  pl: "Polski",
};

export function parseLocale(raw: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(raw ?? "")
    ? (raw as Locale)
    : DEFAULT_LOCALE;
}

export const RATING_MODES = ["steam", "site", "both"] as const;
export type RatingMode = (typeof RATING_MODES)[number];
export const DEFAULT_RATING_MODE: RatingMode = "both";

export const RATING_MODE_COOKIE = "smse_rating_mode";

export function parseRatingMode(raw: string | undefined): RatingMode {
  return (RATING_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as RatingMode)
    : DEFAULT_RATING_MODE;
}

export const THEMES = ["default", "v1", "workshop", "contrast", "custom"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "default";

export const THEME_COOKIE = "smse_theme";
export const THEME_CUSTOM_COOKIE = "smse_theme_custom";

export const THEME_LABELS: Record<Theme, string> = {
  default: "Default",
  v1: "V1",
  workshop: "Workshop",
  contrast: "High contrast",
  custom: "Your theme",
};

export function parseTheme(raw: string | undefined): Theme {
  return (THEMES as readonly string[]).includes(raw ?? "")
    ? (raw as Theme)
    : DEFAULT_THEME;
}

/**
 * User-configurable theme. Each key maps 1:1 onto a CSS variable in
 * globals.css, so the layout can inject them into `html[data-theme="custom"]`
 * as a <style> block when this theme is active. Values are always 7-char
 * #RRGGBB hex — anything else is rejected at the API boundary and the cookie
 * is ignored.
 */
export const CUSTOM_THEME_KEYS = [
  "background",
  "foreground",
  "card",
  "accent",
  "border",
] as const;
export type CustomThemeKey = (typeof CUSTOM_THEME_KEYS)[number];
export type CustomThemeColors = Record<CustomThemeKey, string>;

export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: "#faf7f2",
  foreground: "#2a2a33",
  card: "#f2ede4",
  accent: "#e8833b",
  border: "#d9d3c7",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseCustomThemeColors(
  raw: string | undefined,
): CustomThemeColors | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const out: Partial<CustomThemeColors> = {};
    for (const key of CUSTOM_THEME_KEYS) {
      const v = (parsed as Record<string, unknown>)[key];
      if (typeof v !== "string" || !HEX.test(v)) return null;
      out[key] = v.toLowerCase();
    }
    return out as CustomThemeColors;
  } catch {
    return null;
  }
}
