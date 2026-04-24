import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { getPlayerSummary, getSmPlaytimeMinutes } from "@/lib/steam/client";

export const SESSION_COOKIE_NAME = "smse_session";

// How old the Steam profile snapshot (persona name, avatar, playtime) can
// get before getCurrentUser re-pulls it from the Steam Web API. 10 minutes
// is tight enough that a rename feels near-real-time on the next visit,
// loose enough that casual page-load bursts don't hammer Steam's quota.
// At worst one fetch per user per 10 minutes.
const PROFILE_REFRESH_STALE_MS = 10 * 60 * 1000;

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
 *
 * Steam profile data (persona name, avatar, playtime) is re-pulled from
 * the Steam Web API when it's older than PROFILE_REFRESH_STALE_MS so a
 * user renaming themselves on Steam sees the change reflected on the site
 * on their next visit, without having to sign out and back in. At most
 * one Steam API call per user per refresh window.
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

  return await maybeRefreshSteamProfile(user);
});

async function maybeRefreshSteamProfile(user: User): Promise<User> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return user;

  const lastRefresh = user.profileRefreshedAt?.getTime() ?? 0;
  const staleMs = Date.now() - lastRefresh;
  if (staleMs < PROFILE_REFRESH_STALE_MS) return user;

  try {
    const [profile, playtime] = await Promise.all([
      getPlayerSummary(apiKey, user.steamid),
      getSmPlaytimeMinutes(apiKey, user.steamid).catch(() => null),
    ]);

    if (!profile) {
      // Couldn't load the summary but Steam didn't throw — just stamp the
      // timestamp so we don't retry immediately on every subsequent
      // request. The existing snapshot stays.
      const db = getDb();
      await db
        .update(users)
        .set({ profileRefreshedAt: sql`now()` })
        .where(eq(users.steamid, user.steamid));
      return { ...user, profileRefreshedAt: new Date() };
    }

    const nextPersona = profile.personaname ?? user.personaName;
    const nextAvatar =
      profile.avatarfull ?? profile.avatarmedium ?? user.avatarUrl;
    const nextProfileUrl = profile.profileurl ?? user.profileUrl;
    const nextPlaytime = playtime ?? user.smPlaytimeMinutes;
    const refreshedAt = new Date();

    const db = getDb();
    await db
      .update(users)
      .set({
        personaName: nextPersona,
        avatarUrl: nextAvatar,
        profileUrl: nextProfileUrl,
        smPlaytimeMinutes: nextPlaytime,
        profileRefreshedAt: sql`now()`,
      })
      .where(eq(users.steamid, user.steamid));

    return {
      ...user,
      personaName: nextPersona,
      avatarUrl: nextAvatar,
      profileUrl: nextProfileUrl,
      smPlaytimeMinutes: nextPlaytime,
      profileRefreshedAt: refreshedAt,
    };
  } catch {
    // Steam API hiccup — return the stale snapshot, try again next
    // request. Not stamping profileRefreshedAt means a subsequent
    // request will retry rather than wait a full refresh window.
    return user;
  }
}

export function isBanned(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.bannedUntil && user.bannedUntil.getTime() > Date.now());
}

export function isMuted(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!(user.mutedUntil && user.mutedUntil.getTime() > Date.now());
}
