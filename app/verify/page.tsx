"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startChallenge, submitAnswer, type QuestionPayload } from "./actions";

type UIState =
  | { phase: "loading" }
  | { phase: "question"; q: QuestionPayload; flash?: "correct" | "wrong" }
  | { phase: "wrong_reset" }
  | { phase: "complete" };

export default function VerifyPage() {
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-white/40 animate-pulse">Loading challenge…</p>
        </div>
      }>
        <VerifyChallenge />
      </Suspense>
    </>
  );
}

function VerifyChallenge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [state, setState] = useState<UIState>({ phase: "loading" });
  const [isPending, startTransition] = useTransition();
  const pendingTimers = useRef<number[]>([]);

  useEffect(() => {
    startChallenge().then((q) => setState({ phase: "question", q }));
  }, []);

  useEffect(() => {
    const timers = pendingTimers;
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    if (state.phase === "complete") {
      const t = window.setTimeout(() => router.replace(next), 1200);
      pendingTimers.current.push(t);
      return () => window.clearTimeout(t);
    }
  }, [state.phase, next, router]);

  function scheduleTimer(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      pendingTimers.current = pendingTimers.current.filter((x) => x !== id);
      fn();
    }, ms);
    pendingTimers.current.push(id);
  }

  function handleAnswer(answer: string) {
    if (isPending || state.phase !== "question") return;
    startTransition(async () => {
      const result = await submitAnswer(answer);

      if (result.status === "wrong") {
        const currentQ = (state as { phase: "question"; q: QuestionPayload }).q;
        const freshPromise = startChallenge();
        setState({ phase: "question", q: currentQ, flash: "wrong" });
        const fresh = await freshPromise;
        scheduleTimer(() => setState({ phase: "question", q: fresh }), 900);
        return;
      }

      if (result.status === "complete") {
        setState({ phase: "complete" });
        return;
      }

      setState({ phase: "question", q: (state as { phase: "question"; q: QuestionPayload }).q, flash: "correct" });
      scheduleTimer(() => {
        setState({ phase: "question", q: result.next });
      }, 500);
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-white/40 animate-pulse">Loading challenge…</p>
      </div>
    );
  }

  if (state.phase === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-5xl">⚙️</div>
          <h1 className="text-2xl font-bold text-accent">You're in!</h1>
          <p className="text-white/50 text-sm">Welcome to the Workshop…</p>
        </div>
      </div>
    );
  }

  const { q, flash } = state as { phase: "question"; q: QuestionPayload; flash?: "correct" | "wrong" };

  const flashClass =
    flash === "correct"
      ? "ring-2 ring-green-400"
      : flash === "wrong"
      ? "ring-2 ring-red-500"
      : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Are you a <span className="text-accent">Mechanic</span>?
          </h1>
          <p className="text-sm text-white/50">
            Identify the character to enter the Workshop
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 w-10 rounded-full transition-colors ${
                n < q.questionNumber
                  ? "bg-accent"
                  : n === q.questionNumber
                  ? "bg-accent/60"
                  : "bg-white/10"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-white/40">{q.questionNumber}/3</span>
        </div>

        {/* Image — served through /api/captcha/image so filename is never exposed */}
        <div
          className={`relative overflow-hidden rounded-xl border border-white/10 transition-all duration-200 ${flashClass}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={q.nonce}
            src={`/api/captcha/image?n=${q.nonce}`}
            alt="Who is this?"
            className="w-full object-cover"
            style={{ maxHeight: "280px", objectPosition: "center" }}
            draggable={false}
          />
          <div className="absolute bottom-2 right-3 text-[11px] text-white/30 select-none">
            Who is this?
          </div>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={isPending || !!flash}
              className="rounded-lg border border-white/10 bg-card px-4 py-3 text-sm font-medium text-white/80
                hover:border-accent hover:text-accent hover:bg-accent/5
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Wrong feedback */}
        {flash === "wrong" && (
          <p
            role="status"
            aria-live="polite"
            className="text-center text-sm text-red-400 animate-pulse"
          >
            Wrong — starting over…
          </p>
        )}

        {/* Hint */}
        <p className="text-center text-[11px] text-white/20">
          Only Scrap Mechanic players may enter
        </p>
      </div>
    </div>
  );
}
