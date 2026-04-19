"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { confirmCreationTag } from "@/app/admin/actions";
import { Spinner } from "@/components/Spinner";

/**
 * Creator-only "✓ force" next to any community-sourced tag on /creation/[id].
 * Sets confirmed=true immediately, bypassing the +3 net-vote threshold so
 * the tag becomes publicly visible right away.
 */
export function CreatorTagForceConfirmButton({
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
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("tagId", String(tagId));
    startTransition(async () => {
      try {
        await confirmCreationTag(fd);
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
      aria-busy={isPending}
      aria-label={`Force-confirm ${tagName}`}
      title="Force-confirm (Creator): make this tag public immediately"
      className="ml-1 inline-flex items-center text-[11px] text-foreground/40 hover:text-emerald-300 disabled:opacity-50"
    >
      {isPending ? <Spinner size="xs" /> : "✓"}
    </button>
  );
}
