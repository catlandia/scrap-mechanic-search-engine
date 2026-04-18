import { cookies } from "next/headers";
import {
  parseRatingMode,
  RATING_MODE_COOKIE,
  type RatingMode,
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
