"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { generateQuestions, type CaptchaQuestion } from "@/lib/captcha/questions";
import {
  botVerifiedSessionOptions,
  requireSessionSecret,
  type BotVerifiedSession,
} from "@/lib/captcha/verified-session";

// ─── Types ────────────────────────────────────────────────────────────────────

type CaptchaSession = {
  questions?: CaptchaQuestion[];
  current?: number;
  streak?: number;
};

export type QuestionPayload = {
  options: string[];
  questionNumber: number; // 1-3
  streak: number;
  nonce: string; // random per question — used as img cache-bust key so filename is never sent
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

// ─── Server actions ───────────────────────────────────────────────────────────

export async function startChallenge(): Promise<QuestionPayload> {
  const session = await getSession();
  const questions = generateQuestions();
  session.questions = questions;
  session.current = 0;
  session.streak = 0;
  await session.save();

  const q = questions[0];
  return { options: q.options, questionNumber: 1, streak: 0, nonce: randomUUID() };
}

export async function skipChallenge(): Promise<{ ok: true }> {
  // After one mistake the puzzle becomes busywork — we'd rather let the
  // (likely human) visitor through than harden a barrier that already fails
  // its purpose. Real bots hitting this endpoint still pay the iron-session
  // round-trip without gaining any information about the puzzle pool.
  const session = await getSession();
  session.questions = undefined;
  session.current = undefined;
  session.streak = undefined;
  await session.save();

  const cookieStore = await cookies();
  const verified = await getIronSession<BotVerifiedSession>(
    cookieStore,
    botVerifiedSessionOptions(requireSessionSecret()),
  );
  verified.verified = true;
  await verified.save();
  return { ok: true };
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

    // Seal verified flag into an iron-session cookie. The raw cookie value is
    // encrypted + signed with SESSION_SECRET, so a client can't forge it by
    // setting `bot_verified=1` themselves.
    const cookieStore = await cookies();
    const verified = await getIronSession<BotVerifiedSession>(
      cookieStore,
      botVerifiedSessionOptions(requireSessionSecret()),
    );
    verified.verified = true;
    await verified.save();

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
      nonce: randomUUID(),
    },
  };
}
