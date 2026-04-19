"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeCreationTag } from "@/app/admin/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

const CONFIRM_WINDOW_MS = 4000;

/**
 * Tiny × the Creator sees next to each visible tag on /creation/[id].
 * Sets rejected=true on the creation_tags row so community votes can't
 * re-surface the tag.
 */
export function CreatorTagRemoveButton({
  creationId,
  tagId,
  tagName,
}: {
  creationId: string;
  tagId: number;
  tagName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  // Two-step arm: first click tints the button red and shows a pulsing
  // "confirm?" state; second click within CONFIRM_WINDOW_MS actually
  // removes. Replaces the old window.confirm dialog which jarred the
  // page and couldn't be styled.
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    };
  }, []);

  function handleClick() {
    if (!armed) {
      setArmed(true);
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
      disarmTimer.current = window.setTimeout(
        () => setArmed(false),
        CONFIRM_WINDOW_MS,
      );
      return;
    }
    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("tagId", String(tagId));
    startTransition(async () => {
      try {
        await removeCreationTag(fd);
        setArmed(false);
        router.refresh();
        toast.success(`Removed tag "${tagName}".`);
      } catch (err) {
        setArmed(false);
        toast.error(
          err instanceof Error ? err.message : "Couldn't remove tag.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={armed ? `Confirm remove ${tagName}` : `Remove ${tagName}`}
      title={
        armed
          ? `Click again within 4s to remove "${tagName}" (Creator)`
          : "Remove tag (Creator)"
      }
      className={cn(
        "ml-1 inline-flex items-center rounded text-[11px] disabled:opacity-50",
        armed
          ? "animate-pulse px-1 text-red-300"
          : "text-foreground/40 hover:text-red-300",
      )}
    >
      {isPending ? <Spinner size="xs" /> : armed ? "×?" : "×"}
    </button>
  );
}
