import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type {
  BlockdleSession,
  DailyState,
  EndlessState,
  GameStats,
} from "./types";

export function blockdleSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET missing");
  return {
    // Bumped to _v3 in V8.12 hotfix — session state now stores just
    // guessUuids[] instead of full GuessComparison[] (materialised on
    // read). Fixes iron-session "cookie too long" 500s that hit prod
    // around guess 4. The _v2 cookies stored the old fat shape so we
    // rotate again to make sure nobody carries a stale payload forward.
    cookieName: "smse_blockdle_v3",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getBlockdleSession() {
  const cookieStore = await cookies();
  return getIronSession<BlockdleSession>(cookieStore, blockdleSessionOptions());
}

export function emptyDaily(): DailyState {
  return { guessUuids: [], status: "playing" };
}

export function emptyEndless(): EndlessState {
  return {
    guessUuids: [],
    status: "playing",
    stats: { streak: 0, bestStreak: 0, wins: 0, losses: 0 },
  };
}

export function emptyStats(): GameStats {
  return { streak: 0, bestStreak: 0, wins: 0, losses: 0 };
}
