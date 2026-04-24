"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 8_000;
// Once the announcement flips to completedAt but the serving build id still
// matches what the client was loaded with, Vercel is still uploading /
// promoting the new deployment. Poll faster during that window so the
// reload fires within a couple of seconds of the traffic swap instead of
// up to eight.
const POLL_MS_WAITING_FOR_SWAP = 2_000;
const TICK_MS = 33;
const RELOAD_FLAG_KEY = "smse_deploy_reloaded_id";
// Delay between noticing the CDN has swapped to the new bundle and
// actually calling window.location.reload(). Deliberately long enough
// that the "New version is live — reloading…" confirmation line stays
// visible for ~10s after the swap — we don't want to yank a visitor
// mid-sentence the instant Vercel finishes promoting, when they may
// have typed the countdown out and kept working.
const RELOAD_DELAY_AFTER_SWAP_MS = 11_500;
// Prank banners self-hide this many ms past scheduled_at, independently
// of the server poll, so the "just kidding :^)" line disappears at the
// same moment on every device without depending on the 8s poll cadence.
const PRANK_TAIL_MS = 10_000;
// Baked into the client bundle at build time (see next.config.ts). On
// Vercel this is VERCEL_GIT_COMMIT_SHA; on local dev it's a fallback that
// matches whatever the dev server returns, so no reload ever fires.
const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

interface ActiveAnnouncement {
  id: number;
  scheduledAt: number;
  completedAt: number | null;
  isPrank: boolean;
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
 *
 * Prank rows (isPrank=true, written by the Creator-only /admin/abuse
 * "fake reboot" button) run the full countdown + SFX path identically
 * but swap the final line to "just kidding :^)" and self-hide after
 * PRANK_TAIL_MS. They never auto-reload.
 */
export function DeployBanner({ funMode }: { funMode: boolean }) {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(
    null,
  );
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const cancelledRef = useRef(false);
  // Tracks which announcement id we've already fired each sound for so
  // the countdown jingle doesn't retrigger on every poll and the zero-hit
  // sting doesn't retrigger every render tick once remaining <= 0.
  const countdownPlayedForRef = useRef<number | null>(null);
  const zeroPlayedForRef = useRef<number | null>(null);
  // Handle on the currently-playing countdown jingle so the zero-hit sting
  // can cut it off mid-play. Each play() creates a fresh Audio element —
  // desktop Chrome / Firefox handle that cleanly once the page has had any
  // user gesture (typing, clicking, scrolling), which is essentially every
  // moment a deploy banner is visible.
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);

  const hasBuildSwapped =
    serverBuildId !== null && serverBuildId !== CLIENT_BUILD_ID;

  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function poll() {
      try {
        const res = await fetch("/api/deploy-announcement", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as
          | { active: false; serverNow: number; serverBuildId?: string }
          | {
              active: true;
              id: number;
              scheduledAt: string;
              completedAt: string | null;
              isPrank?: boolean;
              serverNow: number;
              serverBuildId?: string;
            };
        if (cancelledRef.current) return;
        // Correct for any clock skew between this device and the server.
        // serverNow was stamped at the moment the server started building
        // this response; one-way network latency introduces a small error
        // (~ms to tens of ms) which is invisible at second-level display.
        setServerOffset(data.serverNow - Date.now());
        if (data.serverBuildId) setServerBuildId(data.serverBuildId);
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
          isPrank: !!data.isPrank,
        });
      } catch {
        // Network flake is fine — next poll retries. During the deploy
        // itself the request may briefly fail; the banner's last-known
        // state stays on screen instead of flickering off.
      }
    }
    function schedule(delay: number) {
      if (cancelledRef.current) return;
      timer = setTimeout(async () => {
        await poll();
        // Poll faster while we're waiting for Vercel to swap traffic to
        // the new bundle; the announcement is marked complete but the
        // serving deployment hasn't flipped yet. Slow back down otherwise.
        const waitingForSwap =
          announcement?.completedAt != null &&
          !announcement.isPrank &&
          !hasBuildSwapped;
        schedule(waitingForSwap ? POLL_MS_WAITING_FOR_SWAP : POLL_MS);
      }, delay);
    }
    poll();
    schedule(POLL_MS);
    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // We intentionally recreate the poll loop when the completed/swap state
    // changes so the cadence can step down from 8s to 2s as soon as we see
    // completedAt without waiting one full slow poll first.
  }, [announcement?.completedAt, announcement?.isPrank, hasBuildSwapped]);

  useEffect(() => {
    if (announcement === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [announcement]);

  // Countdown jingle — fires once when a new announcement first appears.
  // Play() may reject when the visitor hasn't interacted with the page yet
  // (autoplay policy) — silently ignored, the banner still shows.
  // Gated on Fun Mode: normies still see the countdown but hear nothing.
  useEffect(() => {
    if (!announcement) return;
    if (!funMode) return;
    if (countdownPlayedForRef.current === announcement.id) return;
    if (announcement.completedAt !== null) return;
    countdownPlayedForRef.current = announcement.id;
    const a = new Audio("/sfx/deploy-countdown.mp3");
    countdownAudioRef.current = a;
    a.play().catch(() => {});
  }, [announcement, funMode]);

  // Zero-hit sting — fires once the moment remaining first crosses 0.
  // Cuts off the countdown jingle if it's still playing so the two
  // tracks don't overlap. Also fires a `smse:deploy-sting` window event
  // that EXTREME FUN MODE listens to for the full-screen nuke video.
  useEffect(() => {
    if (!announcement) return;
    if (!funMode) return;
    if (zeroPlayedForRef.current === announcement.id) return;
    if (announcement.completedAt !== null) return;
    const serverNow = now + serverOffset;
    if (announcement.scheduledAt - serverNow > 0) return;
    zeroPlayedForRef.current = announcement.id;
    const prev = countdownAudioRef.current;
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
      countdownAudioRef.current = null;
    }
    const a = new Audio("/sfx/deploy-live.mp3");
    a.play().catch(() => {});
    window.dispatchEvent(new CustomEvent("smse:deploy-sting"));
  }, [announcement, now, serverOffset, funMode]);

  // Auto-reload only once the deploy is marked complete AND the serving
  // deployment's build id has flipped to something other than the one this
  // tab was loaded from. complete-deploy.ts stamps completedAt at the end
  // of `next build`, but Vercel may still be uploading lambdas + warming
  // the CDN for another 30–60s after that — reloading on completedAt alone
  // sometimes landed visitors back on the OLD bundle. Once hasBuildSwapped
  // is true we know routing is already on the new deployment, so the
  // reload lands them on the fresh code. sessionStorage flag keeps the
  // fresh page from reloading itself in a loop during the 2-minute
  // completed-tail window. Prank rows never reach this path because
  // completedAt stays null for their entire lifecycle.
  //
  // RELOAD_DELAY_AFTER_SWAP_MS: once hasBuildSwapped flips true, wait a
  // visible beat before yanking the page out from under the visitor.
  // Bumped to ~11.5s on request — long enough for the "New version is
  // live — reloading…" line to stay up a full ~10s after the CDN swap
  // so the visitor gets to finish whatever sentence they were typing
  // and sees the confirmation instead of an instant blink-to-reload.
  useEffect(() => {
    if (!announcement || announcement.completedAt === null) return;
    if (announcement.isPrank) return;
    if (!hasBuildSwapped) return;
    if (typeof window === "undefined") return;
    const seenId = window.sessionStorage.getItem(RELOAD_FLAG_KEY);
    if (seenId === String(announcement.id)) return;
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(announcement.id));
    const t = setTimeout(
      () => window.location.reload(),
      RELOAD_DELAY_AFTER_SWAP_MS,
    );
    return () => clearTimeout(t);
  }, [announcement, hasBuildSwapped]);

  if (!announcement) return null;

  // Prank announcements from /admin/abuse (fake reboot etc.) are purely a
  // Fun-Mode-only feature — visitors who opted out of Fun Mode should see
  // nothing at all for them. Real deploy rows still render regardless
  // because they're a genuine warning that the site is about to restart.
  if (announcement.isPrank && !funMode) return null;

  // If this announcement was already the reason for a reload AND the new
  // bundle is already serving, we're on the fresh bundle post-reload —
  // hide the banner. If completedAt is set but the build id still matches
  // the old one, we're on the OLD tab waiting for the swap; keep showing
  // the banner so the user sees progress instead of an empty bar.
  if (
    announcement.completedAt !== null &&
    hasBuildSwapped &&
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

  // Prank banner hides itself once its tail window elapses so the ending
  // doesn't depend on when the next server poll happens to land.
  if (announcement.isPrank && serverNow - announcement.scheduledAt > PRANK_TAIL_MS) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-[60] w-full animate-pulse border-b border-red-900/60 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
    >
      {announcement.isPrank && remaining <= 0 ? (
        <span>just kidding :^)</span>
      ) : isCompleted && hasBuildSwapped ? (
        <span>✅ New version is live — reloading the page…</span>
      ) : isCompleted ? (
        <span>
          New version built — waiting for it to go live on the CDN…
        </span>
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
