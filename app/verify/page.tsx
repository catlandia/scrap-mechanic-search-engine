"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { skipChallenge, startChallenge, submitAnswer, type QuestionPayload } from "./actions";

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
          <p className="text-foreground/40 animate-pulse">Loading challenge…</p>
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
  const [zoomed, setZoomed] = useState(false);
  // Revealed once the visitor has missed a question at least once. The captcha
  // is a soft barrier; forcing a perfect streak on every genuine user is hostile.
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const pendingTimers = useRef<number[]>([]);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startChallenge().then((q) => setState({ phase: "question", q }));
  }, []);

  // Close zoom on Escape; move focus into the overlay on open and back to
  // the trigger on close so keyboard users don't get dropped at the top.
  const wasZoomed = useRef(false);
  useEffect(() => {
    if (zoomed) {
      zoomCloseRef.current?.focus();
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setZoomed(false);
      }
      window.addEventListener("keydown", onKey);
      wasZoomed.current = true;
      return () => window.removeEventListener("keydown", onKey);
    } else if (wasZoomed.current) {
      zoomTriggerRef.current?.focus({ preventScroll: true });
      wasZoomed.current = false;
    }
  }, [zoomed]);

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
        setSkipAvailable(true);
        const fresh = await freshPromise;
        scheduleTimer(() => {
          setZoomed(false);
          setState({ phase: "question", q: fresh });
        }, 900);
        return;
      }

      if (result.status === "complete") {
        setZoomed(false);
        setState({ phase: "complete" });
        return;
      }

      setState({ phase: "question", q: (state as { phase: "question"; q: QuestionPayload }).q, flash: "correct" });
      scheduleTimer(() => {
        setZoomed(false);
        setState({ phase: "question", q: result.next });
      }, 500);
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground/40 animate-pulse">Loading challenge…</p>
      </div>
    );
  }

  if (state.phase === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-5xl">⚙️</div>
          <h1 className="text-2xl font-bold text-accent">You're in!</h1>
          <p className="text-foreground/50 text-sm">Welcome to the Workshop…</p>
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
          <p className="text-sm text-foreground/50">
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
                  : "bg-foreground/10"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-foreground/40">{q.questionNumber}/3</span>
        </div>

        {/* Image — served through /api/captcha/image so filename is never exposed.
            object-contain + natural aspect so mobile users don't lose the sides
            of the ~3:1 panoramic screenshots. Click/tap opens a zoomed overlay. */}
        <button
          ref={zoomTriggerRef}
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Tap to zoom in on the image"
          className={`group relative block w-full overflow-hidden rounded-xl border border-foreground/10 bg-black/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${flashClass}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={q.nonce}
            src={`/api/captcha/image?n=${q.nonce}`}
            alt="Who is this?"
            className="mx-auto block h-auto w-full max-h-[60vh] object-contain"
            draggable={false}
          />
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm sm:text-[10px] sm:font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 sm:size-3"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 3.356 9.857l3.644 3.643a.75.75 0 1 0 1.06-1.06l-3.643-3.644A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm3.5-1.75a.75.75 0 0 1 1.5 0v1h1a.75.75 0 0 1 0 1.5h-1v1a.75.75 0 0 1-1.5 0v-1h-1a.75.75 0 0 1 0-1.5h1v-1z"
                clipRule="evenodd"
              />
            </svg>
            Tap to zoom
          </span>
          <span className="pointer-events-none absolute bottom-2 right-3 hidden text-[11px] text-foreground/40 select-none sm:inline">
            Who is this?
          </span>
        </button>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={isPending || !!flash}
              className="rounded-lg border border-foreground/10 bg-card px-4 py-3 text-sm font-medium text-foreground/80
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
        <p className="text-center text-[11px] text-foreground/20">
          Only Scrap Mechanic players may enter
        </p>

        {/* Skip escape hatch — fades in once the visitor has tripped up even
            once. The captcha is a soft gate; we'd rather let a stumped human
            through than waste their time. */}
        <div
          className={`flex justify-center transition-all duration-700 ease-out ${
            skipAvailable
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
          aria-hidden={!skipAvailable}
        >
          <button
            type="button"
            onClick={() => {
              if (skipping) return;
              setSkipping(true);
              startTransition(async () => {
                await skipChallenge();
                setZoomed(false);
                setState({ phase: "complete" });
              });
            }}
            disabled={!skipAvailable || skipping}
            tabIndex={skipAvailable ? 0 : -1}
            className="rounded-full border border-foreground/15 bg-card/60 px-5 py-1.5 text-xs font-medium tracking-wide text-foreground/60 hover:border-accent/50 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            {skipping ? "Letting you in…" : "Skip the puzzle"}
          </button>
        </div>
      </div>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed character image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            ref={zoomCloseRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            aria-label="Close zoom"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 1 0 1.06 1.06L10 11.06l5.72 5.72a.75.75 0 1 0 1.06-1.06L11.06 10l5.72-5.72a.75.75 0 0 0-1.06-1.06L10 8.94 4.28 3.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/captcha/image?n=${q.nonce}`}
            alt="Who is this?"
            className="max-h-[90vh] max-w-[95vw] object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-[11px] text-white/70">
            Tap outside or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
