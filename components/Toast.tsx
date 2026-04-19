"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  createdAt: number;
}

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

/**
 * `useToast()` returns imperative helpers for dropping short feedback
 * messages onto the global toast stack. Must be rendered inside
 * <ToastProvider> (wired once in app/layout.tsx).
 */
export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const DEFAULT_TTL_MS = 4200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextIdRef = useRef(1);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      // Strip to something human — an Error.message that just says "failed"
      // is worse than silence, but we still want to surface real messages.
      const clean = (message ?? "").toString().trim().slice(0, 240);
      if (!clean) return;
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev, { id, tone, message: clean, createdAt: Date.now() }]);
    },
    [],
  );

  const api = useMemo<ToastAPI>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <ToastViewport toasts={toasts} dismiss={dismiss} />,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-end gap-2 px-3 pb-3 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-sm sm:px-0 sm:pb-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  // Fade/slide the toast in on mount, out on dismiss. Using a CSS transition
  // keyed off state avoids importing a real animation library.
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Exit-animation timer; tracked in a ref so unmount (or a second click)
  // can cancel it instead of leaving orphaned setTimeouts behind.
  const exitTimerRef = useRef<number | null>(null);

  function scheduleExit() {
    setLeaving(true);
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      onDismiss();
    }, 200);
  }

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const autoTimer = window.setTimeout(scheduleExit, DEFAULT_TTL_MS);
    return () => {
      window.clearTimeout(autoTimer);
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
    // Intentionally run once per toast mount; scheduleExit reads fresh refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toneStyles: Record<ToastTone, string> = {
    success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-500/50 bg-red-500/15 text-red-100",
    info: "border-accent/40 bg-accent/15 text-accent",
  };
  const icon: Record<ToastTone, string> = {
    success: "✓",
    error: "✕",
    info: "i",
  };

  // Live-region responsibilities live on the outer wrapper, not the
  // interactive <button>: assistive tech shouldn't be told a dismiss
  // button *is* a status/alert — only that there's a new one to announce.
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className="pointer-events-none w-full"
    >
      <button
        type="button"
        onClick={scheduleExit}
        aria-label="Dismiss notification"
        className={cn(
          "pointer-events-auto flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur transition-all duration-200 ease-out",
          toneStyles[toast.tone],
          entered && !leaving
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0",
        )}
      >
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-current/40 text-xs font-bold"
        >
          {icon[toast.tone]}
        </span>
        <span className="min-w-0 flex-1 text-left">{toast.message}</span>
        <span aria-hidden className="shrink-0 text-xs opacity-50">
          ×
        </span>
      </button>
    </div>
  );
}
