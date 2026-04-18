"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteComment, postComment } from "@/lib/community/actions";
import type { CreationCommentRow } from "@/lib/db/queries";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";

export function CommentSection({
  creationId,
  comments,
  viewerSteamid,
  viewerIsMod,
  viewerCanPost,
}: {
  creationId: string;
  comments: CreationCommentRow[];
  viewerSteamid: string | null;
  viewerIsMod: boolean;
  viewerCanPost: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("body", trimmed);
    startTransition(async () => {
      try {
        await postComment(fd);
        setBody("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed");
      }
    });
  }

  function handleDelete(commentId: number) {
    const fd = new FormData();
    fd.append("commentId", String(commentId));
    startTransition(async () => {
      try {
        await deleteComment(fd);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <span className="text-xs text-white/40">
          {comments.filter((c) => !c.deletedAt).length} total
        </span>
      </div>

      {viewerCanPost ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share thoughts, ask a question, drop a tip…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 text-xs text-white/40">
            <div>{error && <span className="text-red-300">{error}</span>}</div>
            <div className="flex items-center gap-2">
              <span>{body.length}/2000</span>
              <button
                type="submit"
                disabled={isPending || !body.trim()}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
              >
                {isPending ? "Posting…" : "Post comment"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-white/60">
          {viewerSteamid
            ? "You can't comment right now — check your profile for a warning / mute / ban."
            : "Sign in with Steam to join the discussion."}
        </div>
      )}

      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="rounded border border-border bg-card/60 px-4 py-3 text-sm text-white/50">
            No comments yet. Be first.
          </li>
        )}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            viewerSteamid={viewerSteamid}
            viewerIsMod={viewerIsMod}
            onDelete={handleDelete}
            pending={isPending}
          />
        ))}
      </ul>
    </section>
  );
}

function CommentItem({
  comment,
  viewerSteamid,
  viewerIsMod,
  onDelete,
  pending,
}: {
  comment: CreationCommentRow;
  viewerSteamid: string | null;
  viewerIsMod: boolean;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const isOwner = viewerSteamid === comment.authorSteamid;
  const canDelete = !comment.deletedAt && (isOwner || viewerIsMod);
  const authorRole = comment.authorRole as UserRole;

  if (comment.deletedAt) {
    return (
      <li className="rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-white/40 italic">
        [deleted]
      </li>
    );
  }

  return (
    <li className="flex gap-3 rounded-md border border-border bg-card/60 px-3 py-2.5">
      {comment.authorAvatarUrl ? (
        <Image
          src={comment.authorAvatarUrl}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-8 shrink-0 rounded-full border border-white/10"
        />
      ) : (
        <div className="size-8 shrink-0 rounded-full bg-white/10" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <UserName
            name={comment.authorName}
            role={authorRole}
            steamid={comment.authorSteamid}
            bold
          />
          <RoleBadge role={authorRole} />
          <span>·</span>
          <time dateTime={comment.createdAt.toISOString?.()}>
            {new Date(comment.createdAt).toLocaleString()}
          </time>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              disabled={pending}
              className={cn(
                "ml-auto text-xs text-white/40 hover:text-red-300",
              )}
            >
              delete
            </button>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm text-white/85">
          {comment.body}
        </p>
      </div>
    </li>
  );
}
