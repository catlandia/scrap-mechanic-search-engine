import { cookies } from "next/headers";
import {
  parseCustomThemeColors,
  parseRatingMode,
  parseTheme,
  RATING_MODE_COOKIE,
  THEME_COOKIE,
  THEME_CUSTOM_COOKIE,
  type CustomThemeColors,
  type RatingMode,
  type Theme,
} from "./prefs";

export async function getRatingMode(): Promise<RatingMode> {
  const store = await cookies();
  return parseRatingMode(store.get(RATING_MODE_COOKIE)?.value);
}

export async function setRatingModeCookie(mode: RatingMode): Promise<void> {
  const store = await cookies();
  store.set(RATING_MODE_COOKIE, mode, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  return parseTheme(store.get(THEME_COOKIE)?.value);
}

export async function setThemeCookie(theme: Theme): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getCustomThemeColors(): Promise<CustomThemeColors | null> {
  const store = await cookies();
  return parseCustomThemeColors(store.get(THEME_CUSTOM_COOKIE)?.value);
}

export async function setCustomThemeCookie(
  colors: CustomThemeColors,
): Promise<void> {
  const store = await cookies();
  store.set(THEME_CUSTOM_COOKIE, JSON.stringify(colors), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
