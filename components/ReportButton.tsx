"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reportCreation } from "@/lib/community/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

const REPORT_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "wrong_tags", label: "Wrong tags — needs re-review" },
  { value: "poor_quality", label: "Poor quality / low effort" },
  { value: "spam", label: "Spam or advertising" },
  { value: "not_scrap_mechanic", label: "Not a Scrap Mechanic item" },
  { value: "other", label: "Other (please explain)" },
];

export function ReportButton({
  creationId,
  signedIn,
}: {
  creationId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_tags");
  const [customText, setCustomText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() =>
          router.push(`/auth/steam/login?next=/creation/${creationId}`)
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground/60 transition hover:border-amber-400/60 hover:text-amber-200"
      >
        <span aria-hidden>⚠</span>
        Report
      </button>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200">
        Report submitted — thanks.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition",
          open
            ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
            : "border-border bg-card text-foreground/70 hover:border-amber-400/60 hover:text-amber-200",
        )}
      >
        <span aria-hidden>⚠</span>
        Report
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData();
            fd.append("creationId", creationId);
            fd.append("reason", reason);
            fd.append("customText", customText);
            startTransition(async () => {
              try {
                await reportCreation(fd);
                setSubmitted(true);
                router.refresh();
                toast.success("Report sent to moderators.");
              } catch (err) {
                const msg = err instanceof Error ? err.message : "failed";
                setError(msg);
                toast.error(msg);
              }
            });
          }}
          className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,90vw)] space-y-3 rounded-md border border-border bg-black/90 p-4 shadow-xl backdrop-blur"
        >
          <div className="text-sm font-medium text-foreground">Report this creation</div>
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            >
              {REPORT_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-foreground/60">
            <span className="mb-1 block">
              Details{reason === "other" ? " (required)" : " (optional)"}
            </span>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={3}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              placeholder="What should a mod see about this?"
            />
          </label>
          {error && <div className="text-xs text-red-300">{error}</div>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-border px-3 py-1 text-xs text-foreground/60 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                (reason === "other" && !customText.trim())
              }
              className="inline-flex items-center gap-1.5 rounded bg-amber-500 px-3 py-1 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {isPending && <Spinner size="xs" />}
              {isPending ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
