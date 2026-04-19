"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { getLatestIngestProgress } from "@/app/admin/actions";
import type { IngestProgress } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// Labels match the IDs Steam uses, but nicer-cased for the progress bar.
const KIND_LABELS: Record<string, string> = {
  blueprint: "Blueprints",
  mod: "Mods",
  world: "Worlds",
  challenge: "Challenges",
  tile: "Tiles",
  custom_game: "Custom Games",
  terrain_asset: "Terrain Assets",
};

export function IngestProgress() {
  const { pending } = useFormStatus();
  const [snapshot, setSnapshot] = useState<IngestProgress | null>(null);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Poll progress while the submit transition is pending, plus one final
  // tick after pending flips back to false so the bar briefly shows 100%
  // before the page revalidation wipes it.
  useEffect(() => {
    if (!pending) {
      // one final fetch so the final "all kinds done" state lands in the UI
      // before the row fades out.
      let cancelled = false;
      getLatestIngestProgress()
        .then((r) => {
          if (cancelled) return;
          setSnapshot(r.progress);
          setRunning(r.running);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    async function tick() {
      try {
        const r = await getLatestIngestProgress();
        if (cancelled) return;
        setSnapshot(r.progress);
        setRunning(r.running);
      } catch {
        // Network/server hiccup — skip this tick and try the next one.
      }
      if (!cancelled) {
        timerRef.current = window.setTimeout(tick, 800);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [pending]);

  // Hide the component entirely when there's nothing to show: not pending,
  // not running, no fresh snapshot worth rendering.
  if (!pending && !running && !snapshot) return null;

  const kindsDone = snapshot?.kindsDone ?? 0;
  const kindsTotal = snapshot?.kindsTotal ?? 0;
  const pageInCurrentKind = snapshot?.pageInCurrentKind ?? 0;
  const pagesPerKind = snapshot?.pagesPerKind ?? 0;
  const currentKind = snapshot?.currentKind ?? null;
  const currentLabel = currentKind ? (KIND_LABELS[currentKind] ?? currentKind) : null;

  // Two-dimensional progress: kinds-completed + page-within-current-kind.
  // Reward the caller with smooth motion by weighting each kind as a unit
  // and adding a fractional page contribution.
  const pageFraction =
    pagesPerKind > 0 ? Math.min(1, pageInCurrentKind / pagesPerKind) : 0;
  const numerator =
    kindsDone + (currentKind && !pending && !running ? 0 : pageFraction);
  const percent =
    kindsTotal > 0 ? Math.min(100, Math.round((numerator / kindsTotal) * 100)) : 0;
  const finished = !pending && !running && kindsDone >= kindsTotal && kindsTotal > 0;
  const shownPercent = finished ? 100 : percent;

  return (
    <div className="rounded-md border border-border bg-card/60 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-foreground/80">
          {finished ? "Ingest complete." : "Running ingest…"}
        </span>
        <span className="font-mono text-foreground/60">
          {kindsTotal > 0 ? `${kindsDone}/${kindsTotal} kinds` : ""}
          {currentLabel && !finished ? ` · ${currentLabel}` : ""}
          {!finished && pagesPerKind > 0 && pageInCurrentKind > 0
            ? ` · page ${pageInCurrentKind}/${pagesPerKind}`
            : ""}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shownPercent}
          aria-label="Ingest progress"
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            finished ? "bg-emerald-500/80" : "bg-accent",
          )}
          style={{ width: `${shownPercent}%` }}
        />
      </div>
    </div>
  );
}
