"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
          <div className="w-full space-y-4 rounded-lg border border-border bg-card p-6 text-center">
            <div aria-hidden className="text-3xl">
              ⚠
            </div>
            <h1 className="text-xl font-semibold text-white">
              Something went wrong.
            </h1>
            <p className="text-sm text-white/70">
              A fatal error prevented the page from loading. Please try again.
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
        </main>
      </body>
    </html>
  );
}
