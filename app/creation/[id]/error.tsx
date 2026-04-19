"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CreationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[creation page] render failed:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-red-500/40 bg-red-500/5 p-6 text-sm">
      <h1 className="text-lg font-semibold text-red-200">
        Couldn&apos;t load this creation.
      </h1>
      <p className="text-foreground/70">
        Something went wrong fetching the page. The creation might have been
        archived or hidden while we were loading it, or there was a network
        hiccup. You can try again, or browse something else.
      </p>
      {error.digest && (
        <p className="font-mono text-[10px] text-foreground/40">
          ref: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Try again
        </button>
        <Link
          href="/new"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
        >
          Browse newest →
        </Link>
      </div>
    </div>
  );
}
