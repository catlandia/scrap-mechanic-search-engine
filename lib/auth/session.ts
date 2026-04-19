import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";

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

function requireSecret(): string {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long (see .env.example).",
    );
  }
  return password;
}

export async function getUserSession() {
  const cookieStore = await cookies();
  return getIronSession<UserSession>(cookieStore, buildSessionOptions(requireSecret()));
}

/**
 * Looks up the currently signed-in user (Steam OpenID session -> users row).
 * Memoised per-request via React's `cache()` so N pages/components using it
 * incur one DB roundtrip.
 *
 * Hard-banned users always resolve as null — their session cookie is
 * effectively dead weight, and routes that depend on getCurrentUser will
 * treat them as ghosts until they sign out or the ban lifts.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getUserSession();
  if (!session.steamid) return null;
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.steamid, session.steamid))
    .limit(1);
  if (!user) return null;
  if (user.hardBanned) return null;
  // Bump lastSeenAt at most once per minute per user. The conditional WHERE
  // keeps this a no-op on most requests (single PK lookup, no row rewrite).
  // We await because neon-http is a one-shot fetch; fire-and-forget would
  // risk the function ending before the write completes.
  try {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(
        and(
          eq(users.steamid, user.steamid),
          or(
            isNull(users.lastSeenAt),
            lt(users.lastSeenAt, sql`now() - interval '1 minute'`),
          ),
        ),
      );
  } catch {
    // Presence tracking is best-effort — never let it block auth.
  }
  return user;
});

export function isBanned(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.bannedUntil && user.bannedUntil.getTime() > Date.now());
}

export function isMuted(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.mutedUntil && user.mutedUntil.getTime() > Date.now());
}
