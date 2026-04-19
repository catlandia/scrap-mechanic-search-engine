"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitSuggestion } from "@/lib/suggestions/actions";

export function SuggestionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", body);
    startTransition(async () => {
      const r = await submitSuggestion(fd);
      setResult(r);
      if (r.ok) {
        setTitle("");
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/70">
            Short title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. Dark mode toggle on public pages"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/70">
            Details (optional)
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Why this matters, how you'd imagine it working, any edge cases."
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex items-center justify-between text-xs text-foreground/40">
          <span>{body.length}/2000</span>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send to Creator"}
          </button>
        </div>
      </form>

      {result?.ok && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Thanks — the Creator will review it. Approved suggestions appear on
          the public board.
        </div>
      )}
      {result && !result.ok && (
        <div
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {result.error}
        </div>
      )}
    </div>
  );
}
