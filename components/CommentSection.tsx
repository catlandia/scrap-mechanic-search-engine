"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteComment,
  postComment,
  reportComment,
  voteComment,
} from "@/lib/community/actions";
import type { CreationCommentRow } from "@/lib/db/queries";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";

// Must match MAX_REPLY_DEPTH in lib/community/actions.ts.
const MAX_DEPTH = 2;

const REPORT_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam or advertising" },
  { value: "poor_quality", label: "Harassment / low effort" },
  { value: "other", label: "Other (please explain)" },
];

export type CommentTarget =
  | { kind: "creation"; creationId: string }
  | { kind: "profile"; profileSteamid: string };

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

function targetFormFields(target: CommentTarget, fd: FormData) {
  if (target.kind === "creation") fd.append("creationId", target.creationId);
  else fd.append("profileSteamid", target.profileSteamid);
}

export function CommentSection({
  target,
  comments,
  viewerSteamid,
  viewerIsMod,
  viewerCanPost,
  heading = "Comments",
}: {
  target: CommentTarget;
  comments: CreationCommentRow[];
  viewerSteamid: string | null;
  viewerIsMod: boolean;
  viewerCanPost: boolean;
  heading?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  // Two-stage delete: first click puts the comment into confirm state, a
  // second click on "confirm delete?" actually fires deleteComment. Guards
  // against fat-finger taps on phones and double-clicks on desktop.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const tree = useMemo(() => buildTree(comments), [comments]);
  const totalVisible = comments.filter((c) => !c.deletedAt).length;

  function submitRoot(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    const fd = new FormData();
    targetFormFields(target, fd);
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
      targetFormFields(target, fd);
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

  function handleVote(commentId: number, next: -1 | 0 | 1) {
    setVoteError(null);
    startTransition(async () => {
      try {
        await voteComment(commentId, next);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "failed";
        if (msg === "cannot_self_vote") {
          setVoteError("You can't vote on your own comment.");
        } else if (msg === "rate_limited") {
          setVoteError("Too many votes — slow down for a minute.");
        } else if (msg.startsWith("signed_out") || msg.startsWith("banned") || msg.startsWith("muted")) {
          setVoteError("You can't vote right now.");
        } else {
          setVoteError(msg);
        }
      }
    });
  }

  function handleDelete(commentId: number) {
    setDeleteError(null);
    const fd = new FormData();
    fd.append("commentId", String(commentId));
    startTransition(async () => {
      try {
        await deleteComment(fd);
        setConfirmingDeleteId(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete comment.",
        );
      }
    });
  }

  const placeholder =
    target.kind === "profile"
      ? "Leave a message on this profile…"
      : "Share thoughts, ask a question, drop a tip…";

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <span className="text-xs text-foreground/40">{totalVisible} total</span>
      </div>

      {viewerCanPost ? (
        <form onSubmit={submitRoot} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={placeholder}
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

      <div role="status" aria-live="polite" className="space-y-2">
        {deleteError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {deleteError}
          </div>
        )}
        {voteError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {voteError}
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
            reportingId={reportingId}
            setReportingId={setReportingId}
            confirmingDeleteId={confirmingDeleteId}
            setConfirmingDeleteId={setConfirmingDeleteId}
            onReply={handleReply}
            onDelete={handleDelete}
            onVote={handleVote}
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
  reportingId,
  setReportingId,
  confirmingDeleteId,
  setConfirmingDeleteId,
  onReply,
  onDelete,
  onVote,
  pending,
}: {
  node: Node;
  depth: number;
  viewerSteamid: string | null;
  viewerIsMod: boolean;
  viewerCanPost: boolean;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  reportingId: number | null;
  setReportingId: (id: number | null) => void;
  confirmingDeleteId: number | null;
  setConfirmingDeleteId: (id: number | null) => void;
  onReply: (parentId: number, body: string) => Promise<void>;
  onDelete: (id: number) => void;
  onVote: (id: number, value: -1 | 0 | 1) => void;
  pending: boolean;
}) {
  const isOwner = viewerSteamid === node.authorSteamid;
  const canDelete = !node.deletedAt && (isOwner || viewerIsMod);
  const canReply = viewerCanPost && !node.deletedAt && depth < MAX_DEPTH;
  // Hide vote controls on the viewer's own comment and on deleted ones;
  // signed-out viewers still see the counts but not the arrows.
  const canVote = viewerCanPost && !node.deletedAt && !isOwner;
  const canReport = viewerCanPost && !node.deletedAt && !isOwner;
  const authorRole = node.authorRole as UserRole;
  const net = node.votesUp - node.votesDown;

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
                <CommentVoteControl
                  net={net}
                  viewerVote={node.viewerVote}
                  canVote={canVote}
                  onVote={(v) => onVote(node.id, v)}
                  pending={pending}
                />
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
                {canReport && (
                  <button
                    type="button"
                    onClick={() =>
                      setReportingId(reportingId === node.id ? null : node.id)
                    }
                    className="text-xs text-foreground/40 hover:text-amber-300"
                    aria-expanded={reportingId === node.id}
                  >
                    {reportingId === node.id ? "cancel" : "report"}
                  </button>
                )}
                {canDelete && (
                  confirmingDeleteId === node.id ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Confirm delete comment by ${node.authorName}`}
                        onClick={() => onDelete(node.id)}
                        disabled={pending}
                        className="rounded border border-red-400/60 bg-red-500/15 px-1.5 py-0.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                      >
                        confirm delete?
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={pending}
                        className="text-xs text-foreground/50 hover:text-foreground"
                      >
                        cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete comment by ${node.authorName}`}
                      onClick={() => setConfirmingDeleteId(node.id)}
                      disabled={pending}
                      className="text-xs text-foreground/40 hover:text-red-300"
                    >
                      delete
                    </button>
                  )
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

      {reportingId === node.id && (
        <ReportForm
          commentId={node.id}
          onDone={() => setReportingId(null)}
          onCancel={() => setReportingId(null)}
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
              reportingId={reportingId}
              setReportingId={setReportingId}
              confirmingDeleteId={confirmingDeleteId}
              setConfirmingDeleteId={setConfirmingDeleteId}
              onReply={onReply}
              onDelete={onDelete}
              onVote={onVote}
              pending={pending}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentVoteControl({
  net,
  viewerVote,
  canVote,
  onVote,
  pending,
}: {
  net: number;
  viewerVote: -1 | 0 | 1;
  canVote: boolean;
  onVote: (v: -1 | 0 | 1) => void;
  pending: boolean;
}) {
  const netColor =
    net > 0 ? "text-emerald-400" : net < 0 ? "text-red-300" : "text-foreground/50";
  if (!canVote) {
    return (
      <span className={cn("text-xs tabular-nums", netColor)} aria-label={`${net} net votes`}>
        {net > 0 ? `+${net}` : net}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <button
        type="button"
        aria-label="Upvote comment"
        aria-pressed={viewerVote === 1}
        disabled={pending}
        onClick={() => onVote(viewerVote === 1 ? 0 : 1)}
        className={cn(
          "rounded px-1 leading-none hover:text-emerald-400 disabled:opacity-50",
          viewerVote === 1 ? "text-emerald-400" : "text-foreground/40",
        )}
      >
        ▲
      </button>
      <span className={cn("tabular-nums", netColor)}>
        {net > 0 ? `+${net}` : net}
      </span>
      <button
        type="button"
        aria-label="Downvote comment"
        aria-pressed={viewerVote === -1}
        disabled={pending}
        onClick={() => onVote(viewerVote === -1 ? 0 : -1)}
        className={cn(
          "rounded px-1 leading-none hover:text-red-300 disabled:opacity-50",
          viewerVote === -1 ? "text-red-300" : "text-foreground/40",
        )}
      >
        ▼
      </button>
    </span>
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

function ReportForm({
  commentId,
  onDone,
  onCancel,
}: {
  commentId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("spam");
  const [customText, setCustomText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        Report submitted — a moderator will take a look. Thanks.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData();
        fd.append("commentId", String(commentId));
        fd.append("reason", reason);
        fd.append("customText", customText);
        startTransition(async () => {
          try {
            await reportComment(fd);
            setSubmitted(true);
            router.refresh();
            setTimeout(onDone, 1500);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "failed";
            if (msg === "already_reported") {
              setErr("You already reported this comment in the last 24 h.");
            } else if (msg === "cannot_self_report") {
              setErr("You can't report your own comment.");
            } else if (msg.startsWith("rate_limited")) {
              setErr("Daily report cap reached (5 per 24 h).");
            } else {
              setErr(msg);
            }
          }
        });
      }}
      className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
    >
      <div className="text-xs font-medium text-amber-200">Report this comment</div>
      <label className="block text-xs text-foreground/60">
        <span className="mb-1 block">Reason</span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
        >
          {REPORT_REASON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-foreground/60">
        <span className="mb-1 block">
          Details{reason === "other" ? " (required)" : " (optional)"}
        </span>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={2}
          className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
        />
      </label>
      {err && <div className="text-xs text-red-300">{err}</div>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-3 py-1 text-xs text-foreground/60 hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || (reason === "other" && !customText.trim())}
          className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </form>
  );
}
