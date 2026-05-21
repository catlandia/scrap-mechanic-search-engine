"use client";

import { useEffect, useState } from "react";
import { UNKNOWN_ERROR, type ErrorInfo } from "@/lib/errors/codes";

type Props = {
  digest?: string;
  initial?: ErrorInfo;
};

export function ErrorExplain({ digest, initial }: Props) {
  const [info, setInfo] = useState<ErrorInfo | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.ok === false && data.code && data.explanation) {
          setInfo({ code: String(data.code), explanation: String(data.explanation) });
        } else {
          setInfo(UNKNOWN_ERROR);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setInfo(UNKNOWN_ERROR);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = info ?? UNKNOWN_ERROR;

  return (
    <div className="mt-3 space-y-1 rounded-md border border-border bg-black/30 p-3 text-left text-xs">
      <p className="font-mono text-[11px] text-amber-200/90">
        Code: {loading ? "checking…" : shown.code}
      </p>
      <p className="text-foreground/70">
        {loading ? "Checking site status…" : shown.explanation}
      </p>
      {digest && (
        <p className="pt-1 font-mono text-[10px] text-foreground/40">
          ref: {digest}
        </p>
      )}
    </div>
  );
}
