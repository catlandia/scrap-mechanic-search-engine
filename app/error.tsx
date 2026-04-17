"use client";

import { useEffect } from "react";

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

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-red-500/40 bg-red-500/10 p-6">
      <h1 className="text-2xl font-semibold text-red-200">Server error</h1>
      <p className="text-sm text-white/70">
        Something broke on the server while rendering this page.
      </p>
      <div className="rounded bg-black/40 p-3 font-mono text-xs text-red-200">
        {error.digest ? <div>digest: {error.digest}</div> : null}
        <div>message: {error.message}</div>
      </div>
      <p className="text-sm text-white/60">
        Open the Vercel dashboard → your project → <strong>Logs</strong> (or run{" "}
        <code className="rounded bg-black/40 px-1 py-0.5">vercel logs</code> locally) and search for
        the digest to see the full stack. Most common causes on first deploy:
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-white/60">
        <li>
          <code className="rounded bg-black/40 px-1 py-0.5">DATABASE_URL</code> not set in Vercel
          env vars.
        </li>
        <li>
          Migrations not applied to Neon — run{" "}
          <code className="rounded bg-black/40 px-1 py-0.5">npm run db:migrate</code> locally with
          production <code className="rounded bg-black/40 px-1 py-0.5">DATABASE_URL</code>.
        </li>
        <li>
          Seed not run — run{" "}
          <code className="rounded bg-black/40 px-1 py-0.5">npm run db:seed</code>.
        </li>
        <li>Neon project paused — first request cold-starts it; refresh once.</li>
      </ul>
      <button
        onClick={reset}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
      >
        Try again
      </button>
    </div>
  );
}
