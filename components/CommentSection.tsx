"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteComment, postComment } from "@/lib/community/actions";
import type { CreationCommentRow } from "@/lib/db/queries";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";

// Must match MAX_REPLY_DEPTH in lib/community/actions.ts.
const MAX_DEPTH = 2;

type Node = CreationCommentRow & { children: Node[] };

function buildTree(rows: CreationCommentRow[]): Node[] {
  const byId = new Map<number, Node>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  const roots: Node[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId != null) {
      const parent = byId.get(row.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
      // Orphaned reply (parent hard-deleted or outside the window) — show as root.
    }
    roots.push(node);
  }
  // Roots: newest first. Replies within a thread: oldest first (reading order).
  roots.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  function sortReplies(n: Node) {
    n.children.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    for (const c of n.children) sortReplies(c);
  }
  for (const r of roots) sortReplies(r);
  return roots;
}

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const tree = useMemo(() => buildTree(comments), [comments]);
  const totalVisible = comments.filter((c) => !c.deletedAt).length;

  function submitRoot(e: React.FormEvent) {
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

  function handleReply(parentId: number, replyBody: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("creationId", creationId);
      fd.append("body", replyBody);
      fd.append("parentId", String(parentId));
      startTransition(async () => {
        try {
          await postComment(fd);
          setReplyingTo(null);
          router.refresh();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function handleDelete(commentId: number) {
    setDeleteError(null);
    const fd = new FormData();
    fd.append("commentId", String(commentId));
    startTransition(async () => {
      try {
        await deleteComment(fd);
        router.refresh();
      } catch (err) {
        console.error(err);
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete comment.",
        );
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <span className="text-xs text-foreground/40">{totalVisible} total</span>
      </div>

      {viewerCanPost ? (
        <form onSubmit={submitRoot} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share thoughts, ask a question, drop a tip…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 text-xs text-foreground/40">
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
        <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-foreground/60">
          {viewerSteamid
            ? "You can't comment right now — check your profile for a warning / mute / ban."
            : "Sign in with Steam to join the discussion."}
        </div>
      )}

      <div role="status" aria-live="polite">
        {deleteError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {deleteError}
          </div>
        )}
      </div>

      <ul className="space-y-3">
        {tree.length === 0 && (
          <li className="rounded border border-border bg-card/60 px-4 py-3 text-sm text-foreground/50">
            No comments yet. Be first.
          </li>
        )}
        {tree.map((n) => (
          <CommentNode
            key={n.id}
            node={n}
            depth={0}
            viewerSteamid={viewerSteamid}
            viewerIsMod={viewerIsMod}
            viewerCanPost={viewerCanPost}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            onReply={handleReply}
            onDelete={handleDelete}
            pending={isPending}
          />
        ))}
      </ul>
    </section>
  );
}

function CommentNode({
  node,
  depth,
  viewerSteamid,
  viewerIsMod,
  viewerCanPost,
  replyingTo,
  setReplyingTo,
  onReply,
  onDelete,
  pending,
}: {
  node: Node;
  depth: number;
  viewerSteamid: string | null;
  viewerIsMod: boolean;
  viewerCanPost: boolean;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  onReply: (parentId: number, body: string) => Promise<void>;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const isOwner = viewerSteamid === node.authorSteamid;
  const canDelete = !node.deletedAt && (isOwner || viewerIsMod);
  const canReply = viewerCanPost && !node.deletedAt && depth < MAX_DEPTH;
  const authorRole = node.authorRole as UserRole;

  return (
    <li id={`comment-${node.id}`} className="space-y-2">
      {node.deletedAt ? (
        <div className="rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-foreground/40 italic">
          [deleted]
        </div>
      ) : (
        <div className="flex gap-3 rounded-md border border-border bg-card/60 px-3 py-2.5">
          {node.authorAvatarUrl ? (
            <Image
              src={node.authorAvatarUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-full border border-foreground/10"
            />
          ) : (
            <div className="size-8 shrink-0 rounded-full bg-foreground/10" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
              <UserName
                name={node.authorName}
                role={authorRole}
                steamid={node.authorSteamid}
                bold
              />
              <RoleBadge role={authorRole} />
              <span>·</span>
              <time dateTime={node.createdAt.toISOString?.()}>
                {new Date(node.createdAt).toLocaleString()}
              </time>
              <div className="ml-auto flex items-center gap-3">
                {canReply && (
                  <button
                    type="button"
                    onClick={() =>
                      setReplyingTo(replyingTo === node.id ? null : node.id)
                    }
                    className="text-xs text-foreground/40 hover:text-accent"
                    aria-expanded={replyingTo === node.id}
                  >
                    {replyingTo === node.id ? "cancel" : "reply"}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label={`Delete comment by ${node.authorName}`}
                    onClick={() => onDelete(node.id)}
                    disabled={pending}
                    className={cn("text-xs text-foreground/40 hover:text-red-300")}
                  >
                    delete
                  </button>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/85">
              {node.body}
            </p>
          </div>
        </div>
      )}

      {replyingTo === node.id && (
        <ReplyForm
          onSubmit={(b) => onReply(node.id, b)}
          onCancel={() => setReplyingTo(null)}
          pending={pending}
        />
      )}

      {node.children.length > 0 && (
        <ul className="space-y-3 border-l-2 border-border/60 pl-3 sm:pl-4">
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              viewerSteamid={viewerSteamid}
              viewerIsMod={viewerIsMod}
              viewerCanPost={viewerCanPost}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onReply={onReply}
              onDelete={onDelete}
              pending={pending}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function ReplyForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed) return;
        setErr(null);
        onSubmit(trimmed).catch((error) =>
          setErr(error instanceof Error ? error.message : "failed"),
        );
      }}
      className="space-y-2 rounded-md border border-border bg-card/40 px-3 py-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={2000}
        autoFocus
        placeholder="Write a reply…"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 text-xs text-foreground/40">
        <div>{err && <span className="text-red-300">{err}</span>}</div>
        <div className="flex items-center gap-2">
          <span>{body.length}/2000</span>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-border px-3 py-1 text-xs hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Posting…" : "Reply"}
          </button>
        </div>
      </div>
    </form>
  );
}
