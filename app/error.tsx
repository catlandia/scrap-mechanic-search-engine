"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <div aria-hidden className="text-3xl">
        ⚠
      </div>
      <h1 className="text-xl font-semibold text-white">Something went wrong.</h1>
      <p className="text-sm text-white/70">
        We hit an unexpected error loading this page. Please try again in a moment.
      </p>
      {error.digest && (
        <p className="text-[11px] text-white/40">ref: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
      >
        Try again
      </button>
      {isDev && (
        <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-left font-mono text-xs text-red-200">
          {error.message}
        </pre>
      )}
    </div>
  );
}
