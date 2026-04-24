export const LOCALES = ["en", "ru", "uk", "de", "pl", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "smse_lang";

// Native names so the language picker reads naturally to speakers of each one,
// regardless of which locale the surrounding UI is currently in.
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  de: "Deutsch",
  pl: "Polski",
  zh: "中文",
};

export function parseLocale(raw: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(raw ?? "")
    ? (raw as Locale)
    : DEFAULT_LOCALE;
}

// Opt-in "Fun Mode". Off by default — the Creator wants the normie experience
// to stay strictly functional: the real deploy countdown still renders so
// visitors get their warning, just without the SFX; prank announcements from
// /admin/abuse (fake reboot) are suppressed entirely. Toggling Fun Mode on
// enables the deploy SFX and makes the visitor eligible to see prank rows.
export const FUN_MODE_COOKIE = "smse_fun_mode";
export const DEFAULT_FUN_MODE = false;

export function parseFunMode(raw: string | undefined): boolean {
  if (raw === "1" || raw === "true") return true;
  return DEFAULT_FUN_MODE;
}

export function serializeFunMode(on: boolean): string {
  return on ? "1" : "0";
}

// "EXTREME FUN MODE" — a second opt-in tier on top of Fun Mode. Gated on
// Fun Mode being on: turning Fun Mode off automatically clears this too
// so the two can never be out of sync (extreme implies fun). The toggle
// renders with an animated rainbow gradient and, when on, orbiting
// coloured lights. For now the toggle has no runtime effect — future
// work will hang random click effects and other ambient events off it,
// but only when the Creator asks for them.
export const FUN_MODE_EXTREME_COOKIE = "smse_fun_mode_extreme";
export const DEFAULT_FUN_MODE_EXTREME = false;

export function parseFunModeExtreme(raw: string | undefined): boolean {
  if (raw === "1" || raw === "true") return true;
  return DEFAULT_FUN_MODE_EXTREME;
}

export function serializeFunModeExtreme(on: boolean): string {
  return on ? "1" : "0";
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

// "auto" = follow the OS/browser's prefers-color-scheme. First-time visitors
// default to this: light OS → Default theme, dark OS → V1 theme. Resolved to
// a concrete value by a tiny inline <head> script before first paint so there's
// no flash of the wrong palette.
export const THEMES = ["auto", "default", "v1", "workshop", "contrast", "custom"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "auto";

export const THEME_COOKIE = "smse_theme";
export const THEME_CUSTOM_COOKIE = "smse_theme_custom";

export const THEME_LABELS: Record<Theme, string> = {
  auto: "Auto",
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
