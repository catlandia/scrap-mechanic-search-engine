"use client";

import { useEffect, useState } from "react";

/**
 * Surfaces `?auth_error=<code>` from the Steam sign-in flow.
 *
 * `/auth/steam/return` has always redirected here with a machine-readable
 * code on failure, but nothing ever rendered it — so every failed sign-in
 * looked identical to "nothing happened", and a database outage was
 * reported as "the Steam login doesn't work". This is the missing half.
 *
 * The param is read from `window.location` inside an effect rather than
 * via `useSearchParams()` so the component never forces a Suspense
 * boundary on the root layout, and is stripped from the URL once shown so
 * a refresh doesn't resurrect a stale error.
 */

const MESSAGES: Record<string, { title: string; detail: string }> = {
  db_unavailable: {
    title: "Signed in with Steam, but our database is down",
    detail:
      "Steam verified you just fine — we couldn't reach our own database to finish creating your session. This is on us, not you or Steam. Please try again later.",
  },
  invalid_assertion: {
    title: "Steam sign-in couldn't be verified",
    detail:
      "Steam's response didn't pass verification. This usually means the sign-in took too long or was opened in a second tab. Please try signing in again.",
  },
  missing_api_key: {
    title: "Steam sign-in is misconfigured",
    detail:
      "The site is missing its Steam API credentials, so sign-in can't complete. The admin has been notified.",
  },
  hard_banned: {
    title: "This account is banned",
    detail:
      "This Steam account has been permanently banned from the site. If you think that's a mistake, you can appeal from the Terms page.",
  },
  missing_secret: {
    title: "Sessions are misconfigured",
    detail:
      "The site is missing its session secret, so it can't sign anyone in. The admin has been notified.",
  },
};

const FALLBACK = {
  title: "Steam sign-in failed",
  detail: "Something went wrong while signing you in. Please try again.",
};

export function AuthErrorBanner() {
  const [error, setError] = useState<{ title: string; detail: string } | null>(
    null,
  );

  useEffect(() => {
    let code: string | null = null;
    try {
      const url = new URL(window.location.href);
      code = url.searchParams.get("auth_error");
      if (code) {
        // Drop the param so a refresh (or a shared link) doesn't re-show it.
        url.searchParams.delete("auth_error");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // Malformed URL — nothing to show.
      return;
    }
    if (!code) return;
    setError(MESSAGES[code] ?? FALLBACK);
  }, []);

  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-b border-red-500/30 bg-red-500/10"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2 text-xs sm:text-sm">
        <span className="font-semibold uppercase tracking-wider text-red-400">
          Sign-in
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-foreground/90">{error.title}</span>{" "}
          <span className="text-foreground/70">{error.detail}</span>
        </span>
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label="Dismiss"
          className="shrink-0 rounded px-2 py-0.5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
