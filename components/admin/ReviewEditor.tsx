"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createGameReview,
  updateGameReview,
  type GameReviewRow,
} from "@/lib/reviews/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export function ReviewEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: GameReviewRow;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [steamAppId, setSteamAppId] = useState(
    initial?.steamAppId !== null && initial?.steamAppId !== undefined
      ? String(initial.steamAppId)
      : "",
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [score, setScore] = useState(
    initial?.score !== null && initial?.score !== undefined
      ? (initial.score / 10).toString()
      : "",
  );
  const [body, setBody] = useState(initial?.body ?? "");
  const [pros, setPros] = useState((initial?.pros ?? []).join("\n"));
  const [cons, setCons] = useState((initial?.cons ?? []).join("\n"));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent | null, publishNow: boolean) {
    e?.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("slug", slug);
    fd.append("steamAppId", steamAppId);
    fd.append("thumbnailUrl", thumbnailUrl);
    fd.append("score", score);
    fd.append("body", body);
    fd.append("pros", pros);
    fd.append("cons", cons);
    if (publishNow) fd.append("publish", "1");
    if (mode === "edit" && initial) fd.append("id", String(initial.id));
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createGameReview(fd)
          : await updateGameReview(fd);
      if (result.ok) {
        toast.success(
          mode === "create"
            ? publishNow
              ? "Review published."
              : "Draft saved."
            : "Review saved.",
        );
        if (mode === "create") {
          setTitle("");
          setSlug("");
          setSteamAppId("");
          setThumbnailUrl("");
          setScore("");
          setBody("");
          setPros("");
          setCons("");
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
            placeholder="e.g. Trailmakers"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Slug (auto from title if blank)">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="trailmakers"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Steam App ID (optional)">
          <input
            type="number"
            value={steamAppId}
            onChange={(e) => setSteamAppId(e.target.value)}
            placeholder="e.g. 387990 (Scrap Mechanic)"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Score / 10 (optional, e.g. 8.7)">
          <input
            type="text"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="8.5"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field
          label="Thumbnail URL (optional — leave blank to use Steam header)"
          className="sm:col-span-2"
        >
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pros (one per line)">
          <textarea
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            rows={4}
            placeholder={"Tight physics\nGreat workshop\nFun multiplayer"}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Cons (one per line)">
          <textarea
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            rows={4}
            placeholder={"Steep learning curve\nUI quirks"}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Body (Markdown — headings, **bold**, lists, links all work)">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          maxLength={20000}
          placeholder={"## My take\n\nWrite the review here. **Markdown** is supported."}
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm leading-relaxed focus:border-accent focus:outline-none"
        />
        <span className="mt-0.5 block text-[10px] text-foreground/40">
          {body.length}/20000
        </span>
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
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
            onClick={() => handleSubmit(null, true)}
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

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs text-foreground/60", className)}>
      <span>
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
