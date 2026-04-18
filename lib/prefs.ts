import { cookies } from "next/headers";

export const RATING_MODES = ["steam", "site", "both"] as const;
export type RatingMode = (typeof RATING_MODES)[number];
export const DEFAULT_RATING_MODE: RatingMode = "both";

const COOKIE_NAME = "smse_rating_mode";

function parseRatingMode(raw: string | undefined): RatingMode {
  return (RATING_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as RatingMode)
    : DEFAULT_RATING_MODE;
}

export async function getRatingMode(): Promise<RatingMode> {
  const store = await cookies();
  return parseRatingMode(store.get(COOKIE_NAME)?.value);
}

export async function setRatingModeCookie(mode: RatingMode): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, mode, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
