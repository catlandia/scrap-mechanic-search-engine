"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteCreation } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const CONFIRM_WINDOW_MS = 5000;

/**
 * Two-step Creator-only delete. First click arms the button for 5 seconds;
 * second click within that window fires the server action. The creation is
 * marked status='deleted' — ingest blocklist blocks re-add forever.
 */
export function DeleteCreationButton({
  creationId,
  creationTitle,
}: {
  creationId: string;
  creationTitle: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    if (!armed) {
      setArmed(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const fd = new FormData();
    fd.append("creationId", creationId);
    startTransition(async () => {
      try {
        await deleteCreation(fd);
        router.push("/");
        router.refresh();
      } catch (err) {
        console.error(err);
        setArmed(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={
        armed
          ? `Click again within 5s to permanently delete “${creationTitle}”`
          : "Creator-only: permanently remove this creation and add it to the ingest blocklist"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
        armed
          ? "animate-pulse border-red-400 bg-red-500/30 text-red-100 hover:bg-red-500/40"
          : "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
      )}
    >
      <span aria-hidden>🗑</span>
      {isPending
        ? "Deleting…"
        : armed
          ? "Click again to confirm delete"
          : "Delete permanently"}
    </button>
  );
}
