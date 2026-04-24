"use client";

import { useEffect, useRef, useState } from "react";

/**
 * EXTREME FUN MODE runtime effects. Mounted once in the root layout; does
 * nothing at all when `enabled` is false.
 *
 * On every click while enabled:
 *   - A `public/fun/hitmarker.png` blip is spawned at the click position,
 *     rotated by a random ±20° so it doesn't look stamped, fades out after
 *     a short lifetime.
 *   - A fresh `new Audio("/fun/hitmarker.mp3")` is played — fresh per click
 *     so rapid-fire clicks can overlay each other instead of cutting the
 *     previous one off.
 *
 * When the deploy banner's zero-hit "alarm" fires (DeployBanner dispatches
 * a `smse:deploy-sting` window event), a silent fullscreen `<video>` of
 * `public/fun/nuke.mp4` is layered over the whole page and auto-removes
 * on the `ended` event. Silent per spec — just the visual.
 */

interface Hitmarker {
  id: number;
  x: number;
  y: number;
  rotation: number;
}

// Lifetime for the hitmarker sprite. The element snaps out the instant
// this timeout fires — no fade — so a rapid-fire sequence of clicks looks
// crisp instead of smearing opacity into a pile.
const HITMARKER_MS = 220;
// Maximum random tilt off vertical, in degrees. ±20 is enough to feel
// hand-stamped without the image going sideways.
const MAX_TILT_DEG = 20;
// Roughly centres the 56×56 sprite on the click point without requiring
// CSS `translate(-50%, -50%)` (which would lose the rotation origin).
const HITMARKER_SIZE = 56;

export function ExtremeFunEffects({ enabled }: { enabled: boolean }) {
  const [hitmarkers, setHitmarkers] = useState<Hitmarker[]>([]);
  const [nukePlaying, setNukePlaying] = useState(false);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const id = nextIdRef.current++;
      const rotation = (Math.random() * 2 - 1) * MAX_TILT_DEG;
      setHitmarkers((prev) => [
        ...prev,
        { id, x: e.clientX, y: e.clientY, rotation },
      ]);
      window.setTimeout(() => {
        setHitmarkers((prev) => prev.filter((h) => h.id !== id));
      }, HITMARKER_MS);
      // Fresh Audio per click so overlapping hits don't cut each other
      // off — the user specifically asked for the sound to stack.
      const a = new Audio("/fun/hitmarker.mp3");
      a.play().catch(() => {});
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onSting = () => setNukePlaying(true);
    window.addEventListener("smse:deploy-sting", onSting);
    return () => window.removeEventListener("smse:deploy-sting", onSting);
  }, [enabled]);

  // When the toggle flips from on to off, flush any in-flight effects so
  // the opt-out takes effect immediately rather than waiting for timers.
  useEffect(() => {
    if (enabled) return;
    setHitmarkers([]);
    setNukePlaying(false);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
      >
        {hitmarkers.map((h) => (
          <img
            key={h.id}
            src="/fun/hitmarker.png"
            alt=""
            width={HITMARKER_SIZE}
            height={HITMARKER_SIZE}
            className="smse-hitmarker absolute select-none"
            style={{
              left: h.x - HITMARKER_SIZE / 2,
              top: h.y - HITMARKER_SIZE / 2,
              transform: `rotate(${h.rotation}deg)`,
            }}
          />
        ))}
      </div>
      {nukePlaying && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black">
          <video
            src="/fun/nuke.mp4"
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
            onEnded={() => setNukePlaying(false)}
            onError={() => setNukePlaying(false)}
          />
        </div>
      )}
    </>
  );
}
