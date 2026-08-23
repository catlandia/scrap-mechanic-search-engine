import type { SessionOptions } from "iron-session";

/**
 * Cookie/session *configuration* only — deliberately free of any database
 * import.
 *
 * `middleware.ts` runs on the edge runtime, which has no Node builtins. It
 * needs `buildSessionOptions` to read the admin session, and when that lived
 * in `session.ts` (which imports the Drizzle client) the entire database
 * driver was dragged into the edge bundle. That was invisible while the
 * driver was Neon's pure-`fetch` HTTP client; the moment it became postgres.js
 * the build failed on `Can't resolve 'net'/'tls'`.
 *
 * Keep this module dependency-free so the edge bundle stays small and the
 * next driver change cannot break middleware.
 */

export const SESSION_COOKIE_NAME = "smse_session";

export interface UserSession {
  steamid?: string;
}

export function buildSessionOptions(password: string): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}
