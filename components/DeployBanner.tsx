"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Top-bar countdown that warns every visitor a deploy is imminent. Polls
 * /api/deploy-announcement every 8s for a scheduled row; when one is
 * active, ticks locally at ~30fps so the millisecond display stays
 * smooth without hammering the server. Turns red + pulses under 10s,
 * then holds "Deploying now…" for a 30-second grace window before
 * self-hiding. The server query already drops rows past the 30s tail,
 * so the client staying open after a deploy doesn't keep showing stale
 * countdowns.
 */
const POLL_MS = 8_000;
const TICK_MS = 33;
const GRACE_MS = 30_000;
const CRITICAL_MS = 10_000;

export function DeployBanner() {
  const [scheduledAt, setScheduledAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    async function poll() {
      try {
        const res = await fetch("/api/deploy-announcement", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as
          | { active: false }
          | { active: true; scheduledAt: string };
        if (cancelledRef.current) return;
        setScheduledAt(
          data.active ? new Date(data.scheduledAt).getTime() : null,
        );
      } catch {
        // Network flake is fine — the next poll retries, and if the server
        // is down for the deploy itself the banner simply stops updating.
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (scheduledAt === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [scheduledAt]);

  if (scheduledAt === null) return null;

  const remaining = scheduledAt - now;
  if (remaining < -GRACE_MS) return null;

  const clamped = Math.max(0, remaining);
  const seconds = Math.floor(clamped / 1000);
  const ms = Math.floor(clamped % 1000);
  const isCritical = remaining > 0 && remaining < CRITICAL_MS;
  const isDeploying = remaining <= 0;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "sticky top-0 z-[60] w-full border-b border-red-900/60 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md",
        isCritical && "animate-pulse",
      )}
    >
      {isDeploying ? (
        <span>Deploying now — the site may briefly flicker. Please wait…</span>
      ) : (
        <span>
          ⚠️ Site restarting in{" "}
          <span className="tabular-nums font-bold">
            {seconds}.{String(ms).padStart(3, "0")}s
          </span>
        </span>
      )}
    </div>
  );
}
