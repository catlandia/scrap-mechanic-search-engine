"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TagWithVotes } from "@/lib/db/queries";
import { suggestTag, voteTag } from "@/lib/community/actions";
import { cn } from "@/lib/utils";
import { breakdownTitle } from "@/components/RoleBreakdown";
import { TagAutocomplete, type TagSuggestion } from "@/components/TagAutocomplete";

interface TagChipState {
  viewerVote: -1 | 0 | 1;
  pending: boolean;
}

export function TagVoteList({
  creationId,
  tags,
  signedIn,
}: {
  creationId: string;
  tags: TagWithVotes[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [stateByTag, setStateByTag] = useState<Record<number, TagChipState>>(
    () => {
      const init: Record<number, TagChipState> = {};
      for (const t of tags) {
        init[t.tagId] = { viewerVote: t.viewerVote, pending: false };
      }
      return init;
    },
  );
  const [isPending, startTransition] = useTransition();

  function cast(tagId: number, target: -1 | 1) {
    if (!signedIn) {
      router.push(`/auth/steam/login?next=/creation/${creationId}`);
      return;
    }
    const current = stateByTag[tagId]?.viewerVote ?? 0;
    const newVote: -1 | 0 | 1 = current === target ? 0 : target;
    setStateByTag((prev) => ({
      ...prev,
      [tagId]: { viewerVote: newVote, pending: true },
    }));
    startTransition(async () => {
      try {
        await voteTag(creationId, tagId, newVote);
        router.refresh();
      } catch (err) {
        setStateByTag((prev) => ({
          ...prev,
          [tagId]: { viewerVote: current, pending: false },
        }));
        console.error(err);
      } finally {
        setStateByTag((prev) => ({
          ...prev,
          [tagId]: { ...(prev[tagId] ?? { viewerVote: newVote }), pending: false },
        }));
      }
    });
  }

  const presentSlugs = tags.map((t) => t.slug);

  async function nominate(pick: TagSuggestion) {
    if (!signedIn) {
      router.push(`/auth/steam/login?next=/creation/${creationId}`);
      return;
    }
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("tagSlug", pick.slug);
    try {
      await suggestTag(fd);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  if (tags.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-white/40">
          No tags yet. Type a tag name below to suggest one — your vote
          counts as the first upvote.
        </div>
        <TagAutocomplete
          placeholder="Suggest a tag (type to search)"
          excludeSlugs={presentSlugs}
          onSelect={nominate}
          disabled={!signedIn}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const local = stateByTag[t.tagId] ?? { viewerVote: t.viewerVote, pending: false };
        const net = t.up - t.down;
        const roleInfo = breakdownTitle(t, "both");
        const elevatedUp = t.modUp + t.eliteUp + t.creatorUp;
        return (
          <li
            key={t.tagId}
            className={cn(
              "flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2 pr-0.5 text-xs",
              t.confirmed
                ? "border-accent/60 bg-accent/15"
                : net >= 3
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-border",
            )}
            title={
              t.confirmed
                ? "Admin-confirmed tag"
                : roleInfo
                  ? `${net >= 0 ? "+" : ""}${net} net · ${roleInfo}`
                  : `${net >= 0 ? "+" : ""}${net} net vote${net === 1 || net === -1 ? "" : "s"}`
            }
          >
            <Link
              href={`/search?tags=${t.slug}`}
              className={cn(
                "font-medium",
                t.confirmed ? "text-accent" : "text-white/80 hover:text-accent",
              )}
            >
              {t.name}
            </Link>
            <span className="select-none font-mono text-[10px] text-white/50">
              {net >= 0 ? `+${net}` : net}
            </span>
            {elevatedUp > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-white/40">
                {t.modUp > 0 && (
                  <span className="text-sky-300" title={`${t.modUp} moderator${t.modUp === 1 ? "" : "s"} upvoted`}>
                    {t.modUp}m
                  </span>
                )}
                {t.eliteUp > 0 && (
                  <span className="text-amber-300" title={`${t.eliteUp} elite moderator${t.eliteUp === 1 ? "" : "s"} upvoted`}>
                    {t.eliteUp}e
                  </span>
                )}
                {t.creatorUp > 0 && (
                  <span className="text-purple-300" title="creator upvoted">
                    ★
                  </span>
                )}
              </span>
            )}
            <div className="flex items-center gap-0.5">
              <VoteArrow
                dir="up"
                active={local.viewerVote === 1}
                disabled={isPending || local.pending}
                onClick={() => cast(t.tagId, 1)}
                title={
                  t.confirmed
                    ? "Admin-confirmed · your vote still counts"
                    : "Upvote this tag"
                }
              />
              <VoteArrow
                dir="down"
                active={local.viewerVote === -1}
                disabled={isPending || local.pending}
                onClick={() => cast(t.tagId, -1)}
                title={
                  t.confirmed
                    ? "Admin-confirmed tag is locked visible regardless"
                    : "Downvote this tag"
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
          Suggest another tag
        </div>
        <TagAutocomplete
          placeholder={
            signedIn ? "Type a tag name…" : "Sign in to suggest tags"
          }
          excludeSlugs={presentSlugs}
          onSelect={nominate}
          disabled={!signedIn}
        />
      </div>
    </div>
  );
}

function VoteArrow({
  dir,
  active,
  disabled,
  onClick,
  title,
}: {
  dir: "up" | "down";
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
}) {
  const activeColor =
    dir === "up"
      ? "text-emerald-300"
      : "text-red-300";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex size-5 items-center justify-center rounded text-[10px] transition disabled:opacity-40",
        active ? activeColor : "text-white/40 hover:text-white",
      )}
    >
      {dir === "up" ? "▲" : "▼"}
    </button>
  );
}
