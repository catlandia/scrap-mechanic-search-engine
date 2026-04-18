"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voteSuggestion, type SuggestionRow } from "@/lib/suggestions/actions";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function SuggestionCard({
  suggestion,
  signedIn,
}: {
  suggestion: SuggestionRow;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(suggestion.viewerVoted);
  const [count, setCount] = useState(suggestion.voteCount);
  const [isPending, startTransition] = useTransition();
  const implemented = suggestion.status === "implemented";

  function toggle() {
    if (!signedIn) {
      router.push("/auth/steam/login?next=/suggestions");
      return;
    }
    const prev = voted;
    setVoted(!prev);
    setCount((c) => c + (prev ? -1 : 1));
    const fd = new FormData();
    fd.append("suggestionId", String(suggestion.id));
    startTransition(async () => {
      try {
        await voteSuggestion(fd);
        router.refresh();
      } catch (err) {
        setVoted(prev);
        setCount((c) => c + (prev ? 1 : -1));
        console.error(err);
      }
    });
  }

  return (
    <article
      className={cn(
        "flex gap-4 rounded-lg border bg-card p-4",
        implemented
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border",
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={voted ? "Remove upvote" : "Upvote"}
          className={cn(
            "flex size-12 flex-col items-center justify-center rounded-md border font-semibold transition disabled:opacity-50",
            voted
              ? "border-accent bg-accent/20 text-accent"
              : "border-border bg-background text-white/60 hover:border-white/30",
          )}
        >
          <span className="text-lg leading-none">▲</span>
          <span className="text-xs">{count}</span>
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">{suggestion.title}</h3>
          {implemented && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
              ✓ implemented
            </span>
          )}
        </div>
        {suggestion.body && (
          <p className="whitespace-pre-wrap text-sm text-white/70">
            {suggestion.body}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
          {suggestion.submitterName && suggestion.submitterSteamid ? (
            <>
              <span>by</span>
              <UserName
                name={suggestion.submitterName}
                role={suggestion.submitterRole as UserRole | null}
                steamid={suggestion.submitterSteamid}
              />
              <RoleBadge role={suggestion.submitterRole as UserRole | null} />
            </>
          ) : (
            <span>submitted anonymously</span>
          )}
          {suggestion.approvedAt && (
            <>
              <span>·</span>
              <span>
                approved {new Date(suggestion.approvedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
        {suggestion.creatorNote && (
          <div className="rounded border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
            <span className="font-medium">Creator note:</span>{" "}
            {suggestion.creatorNote}
          </div>
        )}
      </div>
    </article>
  );
}
