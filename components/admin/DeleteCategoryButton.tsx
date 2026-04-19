"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/app/admin/actions";

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
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const msg =
      tagCount > 0
        ? `Delete category "${categoryName}"?\n\n${tagCount} tag${tagCount === 1 ? "" : "s"} currently live in this category and will fall to "Uncategorised". Creations tagged with them keep the tags. This can't be undone.`
        : `Delete category "${categoryName}"? This can't be undone.`;
    if (!confirm(msg)) return;

    const fd = new FormData();
    fd.append("categoryId", String(categoryId));
    startTransition(async () => {
      try {
        await deleteCategory(fd);
        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Failed to delete category.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Delete category ${categoryName}`}
      title="Delete category"
      className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground/50 hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
    >
      {isPending ? "…" : "×"}
    </button>
  );
}
