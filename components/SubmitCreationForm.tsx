"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitCreation, type SubmitResult } from "@/lib/community/actions";
import { Spinner } from "@/components/Spinner";

export function SubmitCreationForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const fd = new FormData();
    fd.append("input", input);
    startTransition(async () => {
      const r = await submitCreation(fd);
      setResult(r);
      if (r.ok) {
        setInput("");
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
            Steam Workshop URL or published-file ID
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="text"
            required
            autoFocus
            placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..."
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
        >
          {isPending && <Spinner size="sm" />}
          {isPending ? "Submitting…" : "Submit for review"}
        </button>
      </form>

      {result?.ok && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm"
        >
          Thanks — <strong>{result.title}</strong> is now pending mod review.{" "}
          <Link href="/" className="text-emerald-300 hover:underline">
            Back to home ↗
          </Link>
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
