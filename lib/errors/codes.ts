export type ErrorInfo = {
  code: string;
  explanation: string;
};

export const UNKNOWN_ERROR: ErrorInfo = {
  code: "UNKNOWN",
  explanation: "Unknown error.",
};

export function classifyError(err: unknown): ErrorInfo {
  const msg =
    err instanceof Error
      ? `${err.message ?? ""} ${(err as { name?: string }).name ?? ""}`
      : typeof err === "string"
        ? err
        : "";

  if (
    /compute time quota/i.test(msg) ||
    /HTTP status 402/i.test(msg) ||
    /quota.*exceed/i.test(msg)
  ) {
    return {
      code: "STORAGE_QUOTA_EXHAUSTED",
      explanation:
        "The site's free storage tier (Neon) has run out for this billing cycle. The current cycle resets on June 1 — the site will recover automatically then. Until then, fresh database lookups will fail; cached pages still load.",
    };
  }

  if (
    /ECONNREFUSED/i.test(msg) ||
    /ENOTFOUND/i.test(msg) ||
    /ETIMEDOUT/i.test(msg) ||
    /fetch failed/i.test(msg)
  ) {
    return {
      code: "STORAGE_UNREACHABLE",
      explanation:
        "The site couldn't reach its database. This is usually a transient network issue — please try again in a moment.",
    };
  }

  if (/rate limit/i.test(msg) || /429/.test(msg)) {
    return {
      code: "RATE_LIMITED",
      explanation:
        "The site is processing too many requests at once. Try again in a moment.",
    };
  }

  if (/steam/i.test(msg) && /(api|fetch|timeout)/i.test(msg)) {
    return {
      code: "STEAM_API_DOWN",
      explanation:
        "The Steam Web API didn't respond in time. Most of the site still works; only freshly-submitted items may not load until Steam recovers.",
    };
  }

  return UNKNOWN_ERROR;
}
