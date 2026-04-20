"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { generateQuestions, type CaptchaQuestion } from "@/lib/captcha/questions";

// Minigame state. Separate from the login-gate session cookie so the two
// flows don't interfere — playing the game doesn't re-arm the captcha gate,
// and taking the gate doesn't leak into game progress.
type GameSession = {
  questions?: CaptchaQuestion[];
  current?: number;
  streak?: number;
  roundsWon?: number;
  correctTotal?: number;
  wrongTotal?: number;
  bestStreak?: number;
};

export type GameQuestion = {
  options: string[];
  questionNumber: number;
  roundTotal: number;
  nonce: string;
};

export type GameStats = {
  streak: number;
  bestStreak: number;
  roundsWon: number;
  correctTotal: number;
  wrongTotal: number;
};

export type GameAnswerResult =
  | { status: "correct"; next: GameQuestion; stats: GameStats }
  | { status: "round_complete"; next: GameQuestion; stats: GameStats }
  | { status: "wrong"; next: GameQuestion; stats: GameStats };

const ROUND_LENGTH = 3;

function gameSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET missing");
  return {
    cookieName: "smse_scrapcha_game",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 h — long enough that a browser-quit doesn't wipe a good streak
    },
  };
}

async function getGameSession() {
  const cookieStore = await cookies();
  return getIronSession<GameSession>(cookieStore, gameSessionOptions());
}

function statsOf(s: GameSession): GameStats {
  return {
    streak: s.streak ?? 0,
    bestStreak: s.bestStreak ?? 0,
    roundsWon: s.roundsWon ?? 0,
    correctTotal: s.correctTotal ?? 0,
    wrongTotal: s.wrongTotal ?? 0,
  };
}

export async function startGame(): Promise<{ question: GameQuestion; stats: GameStats }> {
  const session = await getGameSession();
  const questions = generateQuestions(ROUND_LENGTH);
  session.questions = questions;
  session.current = 0;
  // Preserve bestStreak / totals across rounds so the game has a meta-score.
  await session.save();

  const q = questions[0];
  return {
    question: {
      options: q.options,
      questionNumber: 1,
      roundTotal: ROUND_LENGTH,
      nonce: randomUUID(),
    },
    stats: statsOf(session),
  };
}

export async function submitGameAnswer(answer: string): Promise<GameAnswerResult> {
  const session = await getGameSession();
  const { questions, current = 0, streak = 0 } = session;

  if (!questions?.length) {
    // Session expired / never started — bounce them into a fresh round.
    const fresh = await startGame();
    return { status: "wrong", next: fresh.question, stats: fresh.stats };
  }

  const currentQ = questions[current];
  const correct = answer.trim().toLowerCase() === currentQ.correct.toLowerCase();

  if (!correct) {
    const newStreak = 0;
    const newWrong = (session.wrongTotal ?? 0) + 1;
    // Re-seed with a brand new round — a wrong answer ends the round; the
    // player can keep going but loses their current streak.
    const fresh = generateQuestions(ROUND_LENGTH);
    session.questions = fresh;
    session.current = 0;
    session.streak = newStreak;
    session.wrongTotal = newWrong;
    await session.save();

    const nextQ = fresh[0];
    return {
      status: "wrong",
      next: {
        options: nextQ.options,
        questionNumber: 1,
        roundTotal: ROUND_LENGTH,
        nonce: randomUUID(),
      },
      stats: statsOf(session),
    };
  }

  const newStreak = streak + 1;
  const newCorrect = (session.correctTotal ?? 0) + 1;
  const newBest = Math.max(session.bestStreak ?? 0, newStreak);
  session.streak = newStreak;
  session.correctTotal = newCorrect;
  session.bestStreak = newBest;

  const nextIdx = current + 1;
  if (nextIdx >= questions.length) {
    // Round complete — roll into a fresh round automatically so play is endless.
    session.roundsWon = (session.roundsWon ?? 0) + 1;
    const fresh = generateQuestions(ROUND_LENGTH);
    session.questions = fresh;
    session.current = 0;
    await session.save();

    const nextQ = fresh[0];
    return {
      status: "round_complete",
      next: {
        options: nextQ.options,
        questionNumber: 1,
        roundTotal: ROUND_LENGTH,
        nonce: randomUUID(),
      },
      stats: statsOf(session),
    };
  }

  session.current = nextIdx;
  await session.save();

  const nextQ = questions[nextIdx];
  return {
    status: "correct",
    next: {
      options: nextQ.options,
      questionNumber: nextIdx + 1,
      roundTotal: ROUND_LENGTH,
      nonce: randomUUID(),
    },
    stats: statsOf(session),
  };
}

export async function resetGame(): Promise<{ stats: GameStats }> {
  const session = await getGameSession();
  session.questions = undefined;
  session.current = undefined;
  session.streak = 0;
  session.roundsWon = 0;
  session.correctTotal = 0;
  session.wrongTotal = 0;
  session.bestStreak = 0;
  await session.save();
  return { stats: statsOf(session) };
}
