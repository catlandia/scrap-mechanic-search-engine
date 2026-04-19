"use client";

import { useState, useTransition } from "react";
import { submitAppeal } from "./actions";

export function AppealForm() {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200"
      >
        <div className="font-semibold">Appeal sent.</div>
        <p className="mt-1 text-emerald-100/80">
          A moderator will review your message and either flip the gate on your
          account or reply in-site. You&apos;ll get a notification when there&apos;s
          an answer.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.append("reason", reason);
        startTransition(async () => {
          const res = await submitAppeal(fd);
          if (res.ok) {
            setSubmitted(true);
          } else {
            setError(res.error);
          }
        });
      }}
      className="space-y-3"
    >
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-widest text-foreground/50">
          Your message to the moderators
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={6}
          maxLength={1000}
          required
          placeholder="Quick intro — who you are, what you want to do on the site (submit creations, comment, etc.), and anything that helps verify you're a real person (a YouTube channel, Twitch handle, Discord, linked social)."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          aria-invalid={error ? true : undefined}
        />
      </label>
      <div className="flex items-center justify-between gap-2 text-xs text-foreground/40">
        <div role="status" aria-live="polite">
          {error && <span className="text-red-300">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span>{reason.length}/1000</span>
          <button
            type="submit"
            disabled={isPending || reason.trim().length < 20}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send appeal"}
          </button>
        </div>
      </div>
    </form>
  );
}
