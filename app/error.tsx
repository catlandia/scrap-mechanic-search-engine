"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <div aria-hidden className="text-3xl">
        ⚠
      </div>
      <h1 className="text-xl font-semibold text-foreground">
        {t("error.title")}
      </h1>
      <p className="text-sm text-foreground/70">{t("error.body")}</p>
      {error.digest && (
        <p className="text-[11px] text-foreground/40">ref: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
      >
        {t("error.retry")}
      </button>
      {isDev && (
        <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-left font-mono text-xs text-red-200">
          {error.message}
        </pre>
      )}
    </div>
  );
}
