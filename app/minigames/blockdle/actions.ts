"use server";

import { BLOCKS } from "@/lib/blockdle/blocks.generated";
import { compareGuess, isWinningComparison } from "@/lib/blockdle/compare";
import { pickDailyBlock, pickRandomBlock, todayUtcIso } from "@/lib/blockdle/pick";
import {
  emptyDaily,
  emptyEndless,
  emptyStats,
  getBlockdleSession,
} from "@/lib/blockdle/session";
import {
  ATTEMPTS_MAX,
  type Block,
  type BlockdleSession,
  type DailyState,
  type EndlessState,
  type GameStats,
  type GuessComparison,
} from "@/lib/blockdle/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { blockdleDailyResults, users } from "@/lib/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type Mode = "daily" | "endless";

export type BlockdleView = {
  mode: Mode;
  attemptsMax: typeof ATTEMPTS_MAX;
  guesses: GuessComparison[];
  status: "playing" | "won" | "lost";
  answer?: Block;
  dateIsoUtc?: string;
  stats?: GameStats;
};

export type SubmitResult =
  | { ok: true; view: BlockdleView }
  | { ok: false; reason: "unknown_block" | "already_finished" | "duplicate_guess" };

function blockByUuid(uuid: string): Block | undefined {
  return BLOCKS.find((b) => b.uuid === uuid);
}

function blockByName(name: string): Block | undefined {
  const raw = name.trim().toLowerCase();
  if (!raw) return undefined;
  // Exact lowercase first so an unambiguous typed title always wins.
  const exact = BLOCKS.find((b) => b.title.toLowerCase() === raw);
  if (exact) return exact;
  // Fallback: compare with all non-alphanumerics stripped so raw-Enter
  // submissions like "craft bot" still resolve to "Craftbot".
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const needle = normalise(raw);
  if (!needle) return undefined;
  return BLOCKS.find((b) => normalise(b.title) === needle);
}

// Rebuild GuessComparison[] from just the stored UUIDs. If the catalogue
// changed between cookie-write and render (rare — only on deploy with a
// fresh blocks.json) any missing uuid is dropped silently; the worst
// case is a "lost" round, not a crash.
function materialiseComparisons(
  guessUuids: readonly string[],
  answerUuid: string | undefined,
): GuessComparison[] {
  if (!answerUuid) return [];
  const answer = blockByUuid(answerUuid);
  if (!answer) return [];
  const out: GuessComparison[] = [];
  for (const u of guessUuids) {
    const g = blockByUuid(u);
    if (!g) continue;
    out.push(compareGuess(g, answer));
  }
  return out;
}

function viewFromDaily(state: DailyState): BlockdleView {
  const answer = state.answerUuid ? blockByUuid(state.answerUuid) : undefined;
  return {
    mode: "daily",
    attemptsMax: ATTEMPTS_MAX,
    guesses: materialiseComparisons(state.guessUuids, state.answerUuid),
    status: state.status,
    answer: state.status === "playing" ? undefined : answer,
    dateIsoUtc: state.dateIsoUtc,
  };
}

function viewFromEndless(state: EndlessState): BlockdleView {
  const answer = state.answerUuid ? blockByUuid(state.answerUuid) : undefined;
  return {
    mode: "endless",
    attemptsMax: ATTEMPTS_MAX,
    guesses: materialiseComparisons(state.guessUuids, state.answerUuid),
    status: state.status,
    answer: state.status === "playing" ? undefined : answer,
    stats: state.stats,
  };
}

// Record a finished daily puzzle to the leaderboard. Only runs for
// signed-in users (anonymous players stay anonymous — they don't get
// on the board). Uses ON CONFLICT DO NOTHING so the first terminal
// submission for that user+date wins; retries after a crash or a
// dev-only reset can't overwrite the real result.
async function recordDailyFinish(
  dateIsoUtc: string,
  guessesUsed: number,
  won: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  try {
    const db = getDb();
    await db
      .insert(blockdleDailyResults)
      .values({
        userId: user.steamid,
        dateIsoUtc,
        guessesUsed,
        won,
      })
      .onConflictDoNothing();
  } catch {
    // Leaderboard writes are best-effort — a DB blip mustn't crash the
    // guess-submission flow. The player's game state is already saved
    // to the session cookie; they just won't appear on the board.
  }
}

async function startDaily(session: BlockdleSession): Promise<DailyState> {
  const today = todayUtcIso();
  const current = session.daily;
  if (current && current.dateIsoUtc === today) return current;
  const answer = pickDailyBlock(today, BLOCKS);
  return {
    dateIsoUtc: today,
    answerUuid: answer.uuid,
    guessUuids: [],
    status: "playing",
  };
}

function startEndless(
  current: EndlessState | undefined,
  excludeUuid?: string,
): EndlessState {
  if (current && current.status === "playing" && current.guessUuids.length > 0) return current;
  const answer = pickRandomBlock(BLOCKS, excludeUuid);
  return {
    answerUuid: answer.uuid,
    guessUuids: [],
    status: "playing",
    stats: current?.stats ?? emptyStats(),
  };
}

export async function startBlockdle(mode: Mode): Promise<BlockdleView> {
  const session = await getBlockdleSession();
  if (mode === "daily") {
    const next = await startDaily(session);
    session.daily = next;
    await session.save();
    return viewFromDaily(next);
  }
  const next = startEndless(session.endless);
  session.endless = next;
  await session.save();
  return viewFromEndless(next);
}

export async function submitBlockdleGuess(
  mode: Mode,
  guessName: string,
): Promise<SubmitResult> {
  const session = await getBlockdleSession();

  const guess = blockByName(guessName);
  if (!guess) return { ok: false, reason: "unknown_block" };

  if (mode === "daily") {
    const today = todayUtcIso();
    let state = session.daily;
    if (!state || state.dateIsoUtc !== today) {
      state = await startDaily(session);
    }
    if (state.status !== "playing") return { ok: false, reason: "already_finished" };
    if (state.guessUuids.includes(guess.uuid)) {
      return { ok: false, reason: "duplicate_guess" };
    }
    const answer = state.answerUuid ? blockByUuid(state.answerUuid) : undefined;
    if (!answer) return { ok: false, reason: "already_finished" };

    const comparison = compareGuess(guess, answer);
    const guessUuids = [...state.guessUuids, guess.uuid];
    const won = isWinningComparison(comparison);
    const lost = !won && guessUuids.length >= ATTEMPTS_MAX;
    state = {
      ...state,
      guessUuids,
      status: won ? "won" : lost ? "lost" : "playing",
    };
    session.daily = state;
    await session.save();
    if ((won || lost) && state.dateIsoUtc) {
      await recordDailyFinish(state.dateIsoUtc, guessUuids.length, won);
    }
    return { ok: true, view: viewFromDaily(state) };
  }

  // endless
  let state = session.endless ?? emptyEndless();
  if (state.status !== "playing" || !state.answerUuid) {
    state = startEndless(state);
  }
  if (state.guessUuids.includes(guess.uuid)) {
    return { ok: false, reason: "duplicate_guess" };
  }
  const answer = blockByUuid(state.answerUuid!);
  if (!answer) return { ok: false, reason: "already_finished" };

  const comparison = compareGuess(guess, answer);
  const guessUuids = [...state.guessUuids, guess.uuid];
  const won = isWinningComparison(comparison);
  const lost = !won && guessUuids.length >= ATTEMPTS_MAX;

  const stats: GameStats = { ...state.stats };
  if (won) {
    stats.streak += 1;
    stats.wins += 1;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
  } else if (lost) {
    stats.streak = 0;
    stats.losses += 1;
  }

  state = {
    ...state,
    guessUuids,
    status: won ? "won" : lost ? "lost" : "playing",
    stats,
  };
  session.endless = state;
  await session.save();
  return { ok: true, view: viewFromEndless(state) };
}

export async function resetBlockdle(mode: Mode): Promise<BlockdleView> {
  const session = await getBlockdleSession();
  if (mode === "daily") {
    // Daily wipes are dev-only — in prod the day's puzzle is committed-to
    // when you start it. This keeps local iteration sane without letting
    // users reroll in production.
    if (process.env.NODE_ENV !== "production") {
      session.daily = emptyDaily();
      await session.save();
    }
    return startBlockdle("daily");
  }

  // Endless reset: keep rolling stats (streak / wins / losses) intact —
  // just seed a fresh round that avoids repeating the last answer. Full
  // stats wipe is `clearEndlessStats`.
  const prior = session.endless;
  const excludeUuid = prior?.answerUuid;
  const answer = pickRandomBlock(BLOCKS, excludeUuid);
  session.endless = {
    answerUuid: answer.uuid,
    guessUuids: [],
    status: "playing",
    stats: prior?.stats ?? emptyStats(),
  };
  await session.save();
  return viewFromEndless(session.endless);
}

export type LeaderboardEntry = {
  steamid: string;
  personaName: string;
  avatarUrl: string | null;
  role: string;
  guessesUsed: number;
  won: boolean;
};

// Today's leaderboard, wins only, ranked by fewest guesses then earliest
// finish. Hard-banned users are filtered so a bad actor can't leave
// lingering entries. Anonymous plays never make it into the table, so
// nothing to filter there.
export async function getTodayLeaderboard(
  limit = 25,
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const today = todayUtcIso();
  const rows = await db
    .select({
      steamid: users.steamid,
      personaName: users.personaName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      guessesUsed: blockdleDailyResults.guessesUsed,
      won: blockdleDailyResults.won,
      createdAt: blockdleDailyResults.createdAt,
    })
    .from(blockdleDailyResults)
    .innerJoin(users, eq(users.steamid, blockdleDailyResults.userId))
    .where(
      and(
        eq(blockdleDailyResults.dateIsoUtc, today),
        eq(blockdleDailyResults.won, true),
        eq(users.hardBanned, false),
      ),
    )
    .orderBy(
      asc(blockdleDailyResults.guessesUsed),
      asc(blockdleDailyResults.createdAt),
    )
    .limit(limit);
  return rows.map((r) => ({
    steamid: r.steamid,
    personaName: r.personaName,
    avatarUrl: r.avatarUrl,
    role: r.role,
    guessesUsed: r.guessesUsed,
    won: r.won,
  }));
}

export type AllTimeEntry = {
  steamid: string;
  personaName: string;
  avatarUrl: string | null;
  role: string;
  wins: number;
  played: number;
  avgGuesses: number;
};

// Cumulative leaderboard across every daily puzzle ever played. Ranked
// by total wins DESC with average-guesses-on-wins ASC as tiebreak, so
// someone with 30 wins at 5.1 avg beats someone with 30 at 6.2. Loss-
// only players (0 wins) are filtered — the board is "people who
// managed to pass it", per the user's ask. Hard-banned users filtered
// for the same reason as the today board.
export async function getAllTimeLeaderboard(
  limit = 25,
): Promise<AllTimeEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      steamid: users.steamid,
      personaName: users.personaName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      wins: sql<number>`COUNT(*) FILTER (WHERE ${blockdleDailyResults.won})::int`,
      played: sql<number>`COUNT(*)::int`,
      avgGuesses: sql<number>`COALESCE(AVG(${blockdleDailyResults.guessesUsed}) FILTER (WHERE ${blockdleDailyResults.won}), 0)::float`,
    })
    .from(blockdleDailyResults)
    .innerJoin(users, eq(users.steamid, blockdleDailyResults.userId))
    .where(eq(users.hardBanned, false))
    .groupBy(users.steamid, users.personaName, users.avatarUrl, users.role)
    .having(sql`COUNT(*) FILTER (WHERE ${blockdleDailyResults.won}) > 0`)
    .orderBy(
      desc(sql`COUNT(*) FILTER (WHERE ${blockdleDailyResults.won})`),
      asc(sql`AVG(${blockdleDailyResults.guessesUsed}) FILTER (WHERE ${blockdleDailyResults.won})`),
    )
    .limit(limit);
  return rows.map((r) => ({
    steamid: r.steamid,
    personaName: r.personaName,
    avatarUrl: r.avatarUrl,
    role: r.role,
    wins: r.wins,
    played: r.played,
    avgGuesses: Math.round(r.avgGuesses * 10) / 10,
  }));
}

export async function clearEndlessStats(): Promise<BlockdleView> {
  const session = await getBlockdleSession();
  const fresh = startEndless(undefined);
  fresh.stats = emptyStats();
  session.endless = fresh;
  await session.save();
  return viewFromEndless(session.endless);
}
