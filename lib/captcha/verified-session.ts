import type { SessionOptions } from "iron-session";

export type BotVerifiedSession = { verified?: true };

export const BOT_VERIFIED_COOKIE = "bot_verified";

// Thirty-day persistence mirrors the old plain cookie. The payload now carries
// an iron-session seal, so forging the cookie requires SESSION_SECRET.
export function botVerifiedSessionOptions(password: string): SessionOptions {
  return {
    cookieName: BOT_VERIFIED_COOKIE,
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export function requireSessionSecret(): string {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (must be ≥ 32 chars)");
  }
  return password;
}
