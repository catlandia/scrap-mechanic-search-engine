"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createChangelogEntry,
  updateChangelogEntry,
  type ChangelogEntryRow,
} from "@/lib/changelog/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import type { ChangelogTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function ChangelogEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ChangelogEntryRow;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tier, setTier] = useState<ChangelogTier>(
    (initial?.tier as ChangelogTier) ?? "update",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent, publishNow: boolean) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("tier", tier);
    fd.append("title", title);
    fd.append("body", body);
    if (publishNow) fd.append("publish", "1");
    if (mode === "edit" && initial) fd.append("id", String(initial.id));
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createChangelogEntry(fd)
          : await updateChangelogEntry(fd);
      if (result.ok) {
        toast.success(
          mode === "create"
            ? publishNow
              ? "Entry published."
              : "Draft saved."
            : "Entry saved.",
        );
        if (mode === "create") {
          setTitle("");
          setBody("");
          router.refresh();
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error ?? "Failed to save.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as ChangelogTier)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="update">Update (big stuff)</option>
            <option value="patch">Patch notes (small stuff)</option>
          </select>
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs text-foreground/60">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
            placeholder={
              tier === "update"
                ? "e.g. Changelog + Ideas board live"
                : "e.g. Fix rating toggle showing on irrelevant pages"
            }
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <label className="block text-xs text-foreground/60">
        Body (plain text, preserved line breaks)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          maxLength={8000}
          placeholder={
            tier === "update"
              ? "What shipped, why, who it's for. Be concrete."
              : "One-line per fix is fine for minor polish."
          }
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <span className="mt-0.5 block text-[10px] text-foreground/40">
          {body.length}/8000
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          onClick={(e) => handleSubmit(e, false)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground disabled:opacity-50",
          )}
        >
          {isPending && <Spinner size="xs" />}
          {mode === "edit" ? "Save edits" : "Save as draft"}
        </button>
        {mode === "create" && (
          <button
            type="button"
            disabled={isPending || !title.trim()}
            onClick={(e) => handleSubmit(e, true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {isPending && <Spinner size="xs" />}
            Publish now
          </button>
        )}
        {mode === "edit" && initial && (
          <span className="ml-auto text-xs text-foreground/40">
            #{initial.id}
            {initial.publishedAt
              ? ` · published ${new Date(initial.publishedAt).toLocaleDateString()}`
              : " · draft"}
          </span>
        )}
      </div>
    </form>
  );
}
