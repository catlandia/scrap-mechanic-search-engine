"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeCreationTag } from "@/app/admin/actions";

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
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Remove "${tagName}" from this creation?`)) return;
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("tagId", String(tagId));
    startTransition(async () => {
      try {
        await removeCreationTag(fd);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Remove ${tagName}`}
      title="Remove tag (Creator)"
      className="ml-1 text-[11px] text-white/40 hover:text-red-300 disabled:opacity-50"
    >
      ×
    </button>
  );
}
