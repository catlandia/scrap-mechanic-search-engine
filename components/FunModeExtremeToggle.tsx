"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Toggle for EXTREME FUN MODE. Flips the cookie; the root layout then
 * mounts `<ExtremeFunEffects enabled>` which attaches the document-wide
 * click handler (spawns a hitmarker PNG at the cursor + overlapping
 * hitmarker.mp3) and listens for the deploy-sting window event to play
 * the fullscreen nuke video.
 *
 * Visually the button has an always-running rainbow gradient (see
 * `.smse-extreme-toggle` in app/globals.css). When on, a conic-gradient
 * aura pseudo-element rotates + breathes behind it so the "lights going
 * around" cue signals the active state at a glance.
 *
 * Gated on Fun Mode: when parent Fun Mode is off, the button is disabled
 * with a hint pointing at how to enable it. Invariant "extreme implies
 * fun" is also enforced server-side in setFunModeExtremeCookie().
 */
export function FunModeExtremeToggle({
  current,
  funModeOn,
}: {
  current: boolean;
  funModeOn: boolean;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname;

  const disabled = !funModeOn;
  const nextValue = current ? "0" : "1";
  const label = current ? "EXTREME FUN — ON" : "EXTREME FUN — OFF";

  return (
    <form
      action="/api/prefs/fun-mode-extreme"
      method="post"
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="next" value={nextUrl} />
      <button
        type="submit"
        name="on"
        value={nextValue}
        disabled={disabled}
        data-extreme={current ? "on" : "off"}
        aria-pressed={current}
        className={[
          "smse-extreme-toggle",
          "relative rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider",
          "border-2 border-white/70 shadow-lg",
          disabled
            ? "cursor-not-allowed opacity-40 saturate-50"
            : "cursor-pointer",
        ].join(" ")}
      >
        {label}
      </button>
      <p className="text-xs text-foreground/60">
        {disabled
          ? "Turn Fun Mode on first — EXTREME needs Fun to be on."
          : current
            ? "Clicks spawn a tilted hitmarker + sound (can overlap). The fake-reboot alarm now triggers a silent fullscreen nuke video. Turn it off if it gets annoying."
            : "Flip it on to arm click effects + the nuke video on the alarm."}
      </p>
    </form>
  );
}
