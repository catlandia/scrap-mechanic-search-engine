"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ShareButton() {
  const toast = useToast();
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Older browsers / insecure contexts. Fall back to a temporary input.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success(t("creation.shareCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("creation.shareFailed"));
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition",
        copied
          ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
          : "border-border bg-card text-foreground/70 hover:border-accent/60 hover:text-accent",
      )}
      aria-label={t("creation.shareAria")}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden
        >
          <path d="M12.2 3.8a3 3 0 0 1 4.24 4.24l-2.83 2.83a3 3 0 0 1-4.24 0 1 1 0 0 0-1.41 1.41 5 5 0 0 0 7.07 0l2.82-2.82a5 5 0 1 0-7.07-7.07l-1.06 1.06a1 1 0 1 0 1.41 1.41l1.06-1.06zM7.78 16.2a3 3 0 0 1-4.24-4.24l2.83-2.83a3 3 0 0 1 4.24 0 1 1 0 0 0 1.41-1.41 5 5 0 0 0-7.07 0L2.12 10.54a5 5 0 1 0 7.07 7.07l1.06-1.06a1 1 0 1 0-1.41-1.41L7.78 16.2z" />
        </svg>
      )}
      {copied ? t("creation.shareCopiedShort") : t("creation.share")}
    </button>
  );
}
