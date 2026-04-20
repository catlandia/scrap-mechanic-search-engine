"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voteSuggestion, type SuggestionRow } from "@/lib/suggestions/actions";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function SuggestionCard({
  suggestion,
  signedIn,
  readOnly = false,
}: {
  suggestion: SuggestionRow;
  signedIn: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(suggestion.viewerVote);
  const [net, setNet] = useState(suggestion.voteCount);
  const [up, setUp] = useState(suggestion.upCount);
  const [down, setDown] = useState(suggestion.downCount);
  const [isPending, startTransition] = useTransition();
  const [pendingDir, setPendingDir] = useState<"up" | "down" | null>(null);
  const implemented = suggestion.status === "implemented";
  const rejected = suggestion.status === "rejected";

  function cast(target: -1 | 1) {
    if (!signedIn) {
      router.push("/auth/steam/login?next=/suggestions");
      return;
    }
    const next: -1 | 0 | 1 = userVote === target ? 0 : target;
    const prev = userVote;
    // Optimistic deltas
    const netDelta = next - prev;
    const upDelta = (next === 1 ? 1 : 0) - (prev === 1 ? 1 : 0);
    const downDelta = (next === -1 ? 1 : 0) - (prev === -1 ? 1 : 0);
    setUserVote(next);
    setNet((n) => n + netDelta);
    setUp((n) => n + upDelta);
    setDown((n) => n + downDelta);
    setPendingDir(target === 1 ? "up" : "down");

    const fd = new FormData();
    fd.append("suggestionId", String(suggestion.id));
    fd.append("value", String(next));
    startTransition(async () => {
      try {
        await voteSuggestion(fd);
        router.refresh();
      } catch (err) {
        // Roll back
        setUserVote(prev);
        setNet((n) => n - netDelta);
        setUp((n) => n - upDelta);
        setDown((n) => n - downDelta);
        const msg = err instanceof Error ? err.message : "Couldn't record vote.";
        toast.error(
          msg === "rate_limited"
            ? "Too many votes — slow down for a minute."
            : msg === "not_votable"
              ? "This idea isn't open for voting."
              : msg,
        );
      } finally {
        setPendingDir(null);
      }
    });
  }

  return (
    <article
      className={cn(
        "flex gap-4 rounded-lg border bg-card p-4",
        implemented
          ? "border-emerald-500/40 bg-emerald-500/5"
          : rejected
            ? "border-red-500/30 bg-red-500/5"
            : "border-border",
      )}
    >
      {readOnly ? (
        <div className="flex flex-col items-center justify-center px-1 text-xs text-foreground/40">
          <span className="font-mono text-sm text-foreground/50">
            {net > 0 ? `+${net}` : net}
          </span>
          <span className="text-[10px] uppercase tracking-wider">closed</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <VoteArrow
            dir="up"
            active={userVote === 1}
            disabled={isPending}
            busy={pendingDir === "up"}
            onClick={() => cast(1)}
          />
          <div
            className={cn(
              "min-w-[2.5ch] text-center font-mono text-sm font-semibold tabular-nums",
              net > 0
                ? "text-emerald-300"
                : net < 0
                  ? "text-red-300"
                  : "text-foreground/60",
            )}
            title={`${up} up · ${down} down`}
          >
            {net > 0 ? `+${net}` : net}
          </div>
          <VoteArrow
            dir="down"
            active={userVote === -1}
            disabled={isPending}
            busy={pendingDir === "down"}
            onClick={() => cast(-1)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">{suggestion.title}</h3>
          {implemented && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
              ✓ implemented
            </span>
          )}
          {rejected && (
            <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-200">
              ✕ rejected
            </span>
          )}
        </div>
        {suggestion.body && (
          <p className="whitespace-pre-wrap text-sm text-foreground/70">
            {suggestion.body}
          </p>
        )}
        {suggestion.imageDataUri && (
           
          <a
            href={suggestion.imageDataUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
            title="Open full size"
          >
            <img
              src={suggestion.imageDataUri}
              alt="Attached by submitter"
              className="max-h-64 rounded border border-border"
            />
          </a>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/40">
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
          <span className="text-foreground/30">
            · {up}↑ / {down}↓
          </span>
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

function VoteArrow({
  dir,
  active,
  disabled,
  busy,
  onClick,
}: {
  dir: "up" | "down";
  active: boolean;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const activeColor =
    dir === "up"
      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-200"
      : "border-red-400/70 bg-red-500/20 text-red-200";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Upvote suggestion" : "Downvote suggestion"}
      aria-busy={busy}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-base transition disabled:opacity-50 disabled:cursor-wait",
        active
          ? activeColor
          : "border-border bg-background text-foreground/60 hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {busy ? <Spinner size="sm" /> : dir === "up" ? "▲" : "▼"}
    </button>
  );
}
