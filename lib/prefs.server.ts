import { cookies } from "next/headers";
import {
  FUN_MODE_COOKIE,
  FUN_MODE_EXTREME_COOKIE,
  LOCALE_COOKIE,
  parseCustomThemeColors,
  parseFunMode,
  parseFunModeExtreme,
  parseLocale,
  parseRatingMode,
  parseTheme,
  RATING_MODE_COOKIE,
  serializeFunMode,
  serializeFunModeExtreme,
  THEME_COOKIE,
  THEME_CUSTOM_COOKIE,
  type CustomThemeColors,
  type Locale,
  type RatingMode,
  type Theme,
} from "./prefs";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

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

export async function getFunMode(): Promise<boolean> {
  const store = await cookies();
  return parseFunMode(store.get(FUN_MODE_COOKIE)?.value);
}

export async function setFunModeCookie(on: boolean): Promise<void> {
  const store = await cookies();
  store.set(FUN_MODE_COOKIE, serializeFunMode(on), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // Extreme Fun is only meaningful while Fun is on. Turning Fun off
  // cascades to Extreme so the two prefs can never drift.
  if (!on) {
    store.set(FUN_MODE_EXTREME_COOKIE, serializeFunModeExtreme(false), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
}

export async function getFunModeExtreme(): Promise<boolean> {
  const store = await cookies();
  // Belt-and-braces: even if the extreme cookie somehow got set while the
  // fun cookie is off, refuse to report extreme as active — keeps the
  // invariant "extreme implies fun" true for every caller.
  const fun = parseFunMode(store.get(FUN_MODE_COOKIE)?.value);
  if (!fun) return false;
  return parseFunModeExtreme(store.get(FUN_MODE_EXTREME_COOKIE)?.value);
}

export async function setFunModeExtremeCookie(on: boolean): Promise<void> {
  const store = await cookies();
  // Guard at the write boundary too: turning Extreme on is a no-op when
  // Fun is off, so the POST handler and any future server-side callers
  // can't create a dangling extreme=on state.
  if (on) {
    const fun = parseFunMode(store.get(FUN_MODE_COOKIE)?.value);
    if (!fun) return;
  }
  store.set(FUN_MODE_EXTREME_COOKIE, serializeFunModeExtreme(on), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
