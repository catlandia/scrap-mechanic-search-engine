"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voteCreation } from "@/lib/community/actions";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";
import type { RoleVoteBreakdown } from "@/lib/db/queries";
import { RoleBreakdown } from "@/components/RoleBreakdown";

export function CreationVotePanel({
  creationId,
  initialUserVote,
  breakdown,
  signedIn,
}: {
  creationId: string;
  initialUserVote: -1 | 0 | 1;
  breakdown: RoleVoteBreakdown;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(initialUserVote);
  const [isPending, startTransition] = useTransition();
  const net = breakdown.up - breakdown.down;
  const total = breakdown.up + breakdown.down;
  const score = total > 0 ? breakdown.up / total : null;

  function cast(target: -1 | 1) {
    if (!signedIn) {
      router.push(`/auth/steam/login?next=/creation/${creationId}`);
      return;
    }
    const newVote: -1 | 0 | 1 = userVote === target ? 0 : target;
    const prev = userVote;
    setUserVote(newVote);
    startTransition(async () => {
      try {
        await voteCreation(creationId, newVote);
        router.refresh();
      } catch (err) {
        setUserVote(prev);
        console.error(err);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card/60 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2">
        <VoteButton
          direction="up"
          active={userVote === 1}
          disabled={isPending}
          onClick={() => cast(1)}
        />
        <div className="min-w-[3ch] text-center font-mono text-lg font-medium">
          {net > 0 ? `+${net}` : net}
        </div>
        <VoteButton
          direction="down"
          active={userVote === -1}
          disabled={isPending}
          onClick={() => cast(-1)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <StarRating
          score={score}
          votesUp={breakdown.up}
          votesDown={breakdown.down}
          size="sm"
          color="orange"
          tag="site"
        />
        <div className="font-mono text-[10px] text-white/40">
          {breakdown.up.toLocaleString()} up · {breakdown.down.toLocaleString()} down
        </div>
        <RoleBreakdown breakdown={breakdown} direction="both" className="mt-0.5" />
      </div>
    </div>
  );
}

function VoteButton({
  direction,
  active,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const activeColor =
    direction === "up"
      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-200"
      : "border-red-400/70 bg-red-500/20 text-red-200";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-9 items-center justify-center rounded-md border text-lg transition disabled:opacity-50",
        active
          ? activeColor
          : "border-border bg-card text-white/60 hover:border-white/40 hover:text-white",
      )}
      aria-label={direction === "up" ? "Upvote" : "Downvote"}
      aria-pressed={active}
    >
      {direction === "up" ? "▲" : "▼"}
    </button>
  );
}
