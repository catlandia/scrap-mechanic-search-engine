"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/app/admin/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

const CONFIRM_WINDOW_MS = 5000;

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  tagCount,
}: {
  categoryId: number;
  categoryName: string;
  tagCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  // Two-step arm replaces the old window.confirm + window.alert combo.
  // First click shows the tag-count warning inline; a second click within
  // CONFIRM_WINDOW_MS actually fires the action.
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
    fd.append("categoryId", String(categoryId));
    startTransition(async () => {
      try {
        await deleteCategory(fd);
        setArmed(false);
        router.refresh();
        toast.success(`Deleted category "${categoryName}".`);
      } catch (err) {
        setArmed(false);
        toast.error(
          err instanceof Error ? err.message : "Failed to delete category.",
        );
      }
    });
  }

  const armedTooltip =
    tagCount > 0
      ? `Click again within 5s. ${tagCount} tag${tagCount === 1 ? "" : "s"} will move to "Uncategorised".`
      : "Click again within 5s to confirm.";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={
        armed
          ? `Confirm delete category ${categoryName}`
          : `Delete category ${categoryName}`
      }
      title={armed ? armedTooltip : "Delete category"}
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-xs disabled:opacity-50",
        armed
          ? "animate-pulse border-red-500/60 bg-red-500/15 text-red-200"
          : "border-border bg-background text-foreground/50 hover:border-red-500/60 hover:text-red-300",
      )}
    >
      {isPending ? <Spinner size="xs" /> : armed ? "×?" : "×"}
    </button>
  );
}
