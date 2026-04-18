"use server";

import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import {
  NORMAL_CHARACTERS,
  CHAPTER_2,
  CHAPTER_2_CHANCE,
  type Character,
} from "@/lib/captcha/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CaptchaQuestion = {
  id: string;
  image: string;
  correct: string;
  options: string[]; // shuffled, includes correct
};

type CaptchaSession = {
  questions?: CaptchaQuestion[];
  current?: number;
  streak?: number;
};

export type QuestionPayload = {
  options: string[];
  questionNumber: number; // 1-3
  streak: number;
};

export type AnswerResult =
  | { status: "correct"; next: QuestionPayload }
  | { status: "complete" }
  | { status: "wrong" };

// ─── Session config ───────────────────────────────────────────────────────────

function captchaSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET missing");
  return {
    cookieName: "smse_captcha",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 30, // 30 min
    },
  };
}

async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<CaptchaSession>(cookieStore, captchaSessionOptions());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickImage(images: string[]): string {
  return images[Math.floor(Math.random() * images.length)];
}

function buildQuestion(char: Character, pool: Character[]): CaptchaQuestion {
  const wrongPool = pool.filter((c) => c.id !== char.id).map((c) => c.answer);
  const wrongOptions = shuffle(wrongPool).slice(0, 3);
  const options = shuffle([char.answer, ...wrongOptions]);
  return { id: char.id, image: pickImage(char.images), correct: char.answer, options };
}

function generateQuestions(): CaptchaQuestion[] {
  const allChars = [...NORMAL_CHARACTERS, CHAPTER_2];
  const used = new Set<string>();
  const questions: CaptchaQuestion[] = [];

  for (let i = 0; i < 3; i++) {
    const useChapter2 = !used.has("chapter2") && Math.random() < CHAPTER_2_CHANCE;

    let char: Character;
    if (useChapter2) {
      char = CHAPTER_2;
    } else {
      const available = NORMAL_CHARACTERS.filter((c) => !used.has(c.id));
      char = available[Math.floor(Math.random() * available.length)];
    }

    used.add(char.id);
    questions.push(buildQuestion(char, allChars));
  }

  return questions;
}

// ─── Server actions ───────────────────────────────────────────────────────────

export async function startChallenge(): Promise<QuestionPayload> {
  const session = await getSession();
  const questions = generateQuestions();
  session.questions = questions;
  session.current = 0;
  session.streak = 0;
  await session.save();

  const q = questions[0];
  return { options: q.options, questionNumber: 1, streak: 0 };
}

export async function submitAnswer(answer: string): Promise<AnswerResult> {
  const session = await getSession();
  const { questions, current = 0, streak = 0 } = session;

  if (!questions?.length) {
    await startChallenge();
    return { status: "wrong" };
  }

  const currentQ = questions[current];
  const correct = answer.trim().toLowerCase() === currentQ.correct.toLowerCase();

  if (!correct) {
    const fresh = generateQuestions();
    session.questions = fresh;
    session.current = 0;
    session.streak = 0;
    await session.save();
    return { status: "wrong" };
  }

  const newStreak = streak + 1;

  if (newStreak >= 3) {
    // Clear captcha session
    session.questions = undefined;
    session.current = undefined;
    session.streak = undefined;
    await session.save();

    // Set verified cookie (30 days)
    const cookieStore = await cookies();
    cookieStore.set("bot_verified", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return { status: "complete" };
  }

  const nextIdx = current + 1;
  session.current = nextIdx;
  session.streak = newStreak;
  await session.save();

  const nextQ = questions[nextIdx];
  return {
    status: "correct",
    next: {
      options: nextQ.options,
      questionNumber: nextIdx + 1,
      streak: newStreak,
    },
  };
}
