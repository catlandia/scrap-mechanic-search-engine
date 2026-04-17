import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
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
  return user ?? null;
});
