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
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return BLOCKS.find((b) => b.title.toLowerCase() === needle);
}

function viewFromDaily(state: DailyState): BlockdleView {
  const answer = state.answerUuid ? blockByUuid(state.answerUuid) : undefined;
  return {
    mode: "daily",
    attemptsMax: ATTEMPTS_MAX,
    guesses: state.guesses,
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
    guesses: state.guesses,
    status: state.status,
    answer: state.status === "playing" ? undefined : answer,
    stats: state.stats,
  };
}

async function startDaily(session: BlockdleSession): Promise<DailyState> {
  const today = todayUtcIso();
  const current = session.daily;
  if (current && current.dateIsoUtc === today) return current;
  const answer = pickDailyBlock(today, BLOCKS);
  return {
    dateIsoUtc: today,
    answerUuid: answer.uuid,
    guesses: [],
    status: "playing",
  };
}

function startEndless(
  current: EndlessState | undefined,
  excludeUuid?: string,
): EndlessState {
  if (current && current.status === "playing" && current.guesses.length > 0) return current;
  const answer = pickRandomBlock(BLOCKS, excludeUuid);
  return {
    answerUuid: answer.uuid,
    guesses: [],
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
    if (state.guesses.some((g) => g.guessUuid === guess.uuid)) {
      return { ok: false, reason: "duplicate_guess" };
    }
    const answer = state.answerUuid ? blockByUuid(state.answerUuid) : undefined;
    if (!answer) return { ok: false, reason: "already_finished" };

    const comparison = compareGuess(guess, answer);
    const guesses = [...state.guesses, comparison];
    const won = isWinningComparison(comparison);
    const lost = !won && guesses.length >= ATTEMPTS_MAX;
    state = {
      ...state,
      guesses,
      status: won ? "won" : lost ? "lost" : "playing",
    };
    session.daily = state;
    await session.save();
    return { ok: true, view: viewFromDaily(state) };
  }

  // endless
  let state = session.endless ?? emptyEndless();
  if (state.status !== "playing" || !state.answerUuid) {
    state = startEndless(state);
  }
  if (state.guesses.some((g) => g.guessUuid === guess.uuid)) {
    return { ok: false, reason: "duplicate_guess" };
  }
  const answer = blockByUuid(state.answerUuid!);
  if (!answer) return { ok: false, reason: "already_finished" };

  const comparison = compareGuess(guess, answer);
  const guesses = [...state.guesses, comparison];
  const won = isWinningComparison(comparison);
  const lost = !won && guesses.length >= ATTEMPTS_MAX;

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
    guesses,
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
    guesses: [],
    status: "playing",
    stats: prior?.stats ?? emptyStats(),
  };
  await session.save();
  return viewFromEndless(session.endless);
}

export async function clearEndlessStats(): Promise<BlockdleView> {
  const session = await getBlockdleSession();
  const fresh = startEndless(undefined);
  fresh.stats = emptyStats();
  session.endless = fresh;
  await session.save();
  return viewFromEndless(session.endless);
}
