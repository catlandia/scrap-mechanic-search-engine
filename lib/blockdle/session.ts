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
    cookieName: "smse_blockdle",
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
