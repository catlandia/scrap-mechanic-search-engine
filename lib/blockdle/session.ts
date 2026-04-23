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
    // Bumped to _v2 in V8.12 — the GuessComparison shape gained
    // guessInventoryType / guessFlammable / guessLevel / guessMaxLevel.
    // An old cookie's stored comparisons would render undefined cells if
    // we kept the same name, so we force-rotate by changing the cookie
    // name: every visitor silently starts fresh on the new schema.
    cookieName: "smse_blockdle_v2",
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
  return { guesses: [], status: "playing" };
}

export function emptyEndless(): EndlessState {
  return {
    guesses: [],
    status: "playing",
    stats: { streak: 0, bestStreak: 0, wins: 0, losses: 0 },
  };
}

export function emptyStats(): GameStats {
  return { streak: 0, bestStreak: 0, wins: 0, losses: 0 };
}
