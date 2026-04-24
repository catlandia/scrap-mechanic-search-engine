"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 8_000;
const TICK_MS = 33;
const RELOAD_FLAG_KEY = "smse_deploy_reloaded_id";

interface ActiveAnnouncement {
  id: number;
  scheduledAt: number;
  completedAt: number | null;
}

/**
 * Top-bar countdown that warns every visitor a deploy is imminent. The
 * banner stays visible from the moment an announcement row is written
 * until the new deploy is actually live (completedAt stamped by the
 * post-build step). Once completedAt is seen the client auto-reloads
 * once per announcement so the user lands on the new bundle without
 * having to refresh manually.
 *
 * The countdown is server-synchronized: every poll returns the server's
 * current wall-clock time, and the client stores the offset between its
 * own Date.now() and the server's. Render math uses the corrected
 * server-perspective time, so every tab across every device sees the
 * same countdown regardless of local clock drift. Between polls the
 * client relies on local time *passage* being accurate (monotonic) —
 * only absolute clock skew matters, and that's re-synced every 8s.
 */
export function DeployBanner() {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(
    null,
  );
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());
  const cancelledRef = useRef(false);
  // Tracks which announcement id we've already fired each sound for so
  // the countdown jingle doesn't retrigger on every poll and the zero-hit
  // sting doesn't retrigger every render tick once remaining <= 0.
  const countdownPlayedForRef = useRef<number | null>(null);
  const zeroPlayedForRef = useRef<number | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    async function poll() {
      try {
        const res = await fetch("/api/deploy-announcement", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as
          | { active: false; serverNow: number }
          | {
              active: true;
              id: number;
              scheduledAt: string;
              completedAt: string | null;
              serverNow: number;
            };
        if (cancelledRef.current) return;
        // Correct for any clock skew between this device and the server.
        // serverNow was stamped at the moment the server started building
        // this response; one-way network latency introduces a small error
        // (~ms to tens of ms) which is invisible at second-level display.
        setServerOffset(data.serverNow - Date.now());
        if (!data.active) {
          setAnnouncement(null);
          return;
        }
        setAnnouncement({
          id: data.id,
          scheduledAt: new Date(data.scheduledAt).getTime(),
          completedAt: data.completedAt
            ? new Date(data.completedAt).getTime()
            : null,
        });
      } catch {
        // Network flake is fine — next poll retries. During the deploy
        // itself the request may briefly fail; the banner's last-known
        // state stays on screen instead of flickering off.
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
    if (announcement === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [announcement]);

  // Countdown jingle — fires once when a new announcement first appears.
  // Play() may reject when the visitor hasn't interacted with the page yet
  // (autoplay policy) — silently ignored, the banner still shows.
  useEffect(() => {
    if (!announcement) return;
    if (countdownPlayedForRef.current === announcement.id) return;
    if (announcement.completedAt !== null) return;
    countdownPlayedForRef.current = announcement.id;
    const a = new Audio("/sfx/deploy-countdown.mp3");
    a.play().catch(() => {});
  }, [announcement]);

  // Zero-hit sting — fires once the moment remaining first crosses 0.
  useEffect(() => {
    if (!announcement) return;
    if (zeroPlayedForRef.current === announcement.id) return;
    if (announcement.completedAt !== null) return;
    const serverNow = now + serverOffset;
    if (announcement.scheduledAt - serverNow > 0) return;
    zeroPlayedForRef.current = announcement.id;
    const a = new Audio("/sfx/deploy-live.mp3");
    a.play().catch(() => {});
  }, [announcement, now, serverOffset]);

  // Auto-reload once the deploy is marked complete, but only once per
  // announcement — sessionStorage flag keeps the new page from reloading
  // itself in a loop if completedAt is still within the 2-minute query
  // window on the fresh bundle.
  useEffect(() => {
    if (!announcement || announcement.completedAt === null) return;
    if (typeof window === "undefined") return;
    const seenId = window.sessionStorage.getItem(RELOAD_FLAG_KEY);
    if (seenId === String(announcement.id)) return;
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(announcement.id));
    const t = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(t);
  }, [announcement]);

  if (!announcement) return null;

  // If this announcement was already the reason for a reload, it's the
  // same visit — don't show the "just completed" state again.
  if (
    announcement.completedAt !== null &&
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(RELOAD_FLAG_KEY) === String(announcement.id)
  ) {
    return null;
  }

  const serverNow = now + serverOffset;
  const remaining = announcement.scheduledAt - serverNow;
  const isCompleted = announcement.completedAt !== null;
  const isDeploying = !isCompleted && remaining <= 0;
  const clamped = Math.max(0, remaining);
  const seconds = Math.floor(clamped / 1000);
  const ms = Math.floor(clamped % 1000);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-[60] w-full animate-pulse border-b border-red-900/60 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
    >
      {isCompleted ? (
        <span>✅ New version is live — reloading the page…</span>
      ) : isDeploying ? (
        <span>
          Deploying now — the page will auto-refresh when the new version is
          ready.
        </span>
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
