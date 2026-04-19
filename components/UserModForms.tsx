"use client";

import { useState } from "react";
import {
  banUser,
  clearBan,
  clearHardBan,
  clearMute,
  clearWarnings,
  hardBanUser,
  muteUser,
  setAgeGateBypass,
  warnUser,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "perma", label: "Permanent" },
];

export function UserModForms({
  targetSteamid,
  viewerIsCreator,
  viewerIsEliteOrCreator,
  isCurrentlyBanned,
  isCurrentlyMuted,
  isCurrentlyHardBanned,
  warningsCount = 0,
  bypassAgeGate = false,
}: {
  targetSteamid: string;
  viewerIsCreator: boolean;
  viewerIsEliteOrCreator: boolean;
  isCurrentlyBanned: boolean;
  isCurrentlyMuted: boolean;
  isCurrentlyHardBanned: boolean;
  warningsCount?: number;
  bypassAgeGate?: boolean;
}) {
  const [open, setOpen] = useState<null | "ban" | "mute" | "warn" | "hardban">(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1 text-xs">
      <button
        type="button"
        className="rounded border border-border bg-background px-2 py-0.5 text-foreground/60 hover:border-amber-400/60 hover:text-amber-200"
        onClick={() => setOpen(open === "warn" ? null : "warn")}
      >
        Warn
      </button>
      {viewerIsEliteOrCreator && (
        <>
          {isCurrentlyMuted ? (
            <form action={clearMute}>
              <input type="hidden" name="steamid" value={targetSteamid} />
              <button
                type="submit"
                className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-200 hover:bg-sky-500/20"
              >
                Unmute
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="rounded border border-border bg-background px-2 py-0.5 text-foreground/60 hover:border-sky-400/60 hover:text-sky-200"
              onClick={() => setOpen(open === "mute" ? null : "mute")}
            >
              Mute
            </button>
          )}
        </>
      )}
      {viewerIsCreator && warningsCount > 0 && (
        <form action={clearWarnings}>
          <input type="hidden" name="steamid" value={targetSteamid} />
          <button
            type="submit"
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200 hover:bg-amber-500/20"
            title={`Clear all ${warningsCount} warning${warningsCount === 1 ? "" : "s"}`}
          >
            Clear warnings
          </button>
        </form>
      )}
      {viewerIsCreator && (
        <form action={setAgeGateBypass}>
          <input type="hidden" name="steamid" value={targetSteamid} />
          <input type="hidden" name="on" value={bypassAgeGate ? "0" : "1"} />
          <button
            type="submit"
            className={cn(
              "rounded px-2 py-0.5",
              bypassAgeGate
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                : "border border-border bg-background text-foreground/60 hover:border-emerald-400/60 hover:text-emerald-200",
            )}
            title={
              bypassAgeGate
                ? "Revoke the age-gate bypass — user must wait the 7 days"
                : "Allow this user past the 7-day Steam account-age gate"
            }
          >
            {bypassAgeGate ? "Revoke age bypass" : "Allow young account"}
          </button>
        </form>
      )}
      {viewerIsCreator && (
        <>
          {isCurrentlyBanned ? (
            <form action={clearBan}>
              <input type="hidden" name="steamid" value={targetSteamid} />
              <button
                type="submit"
                className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-200 hover:bg-emerald-500/20"
              >
                Unban
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="rounded border border-border bg-background px-2 py-0.5 text-foreground/60 hover:border-red-400/60 hover:text-red-200"
              onClick={() => setOpen(open === "ban" ? null : "ban")}
            >
              Ban
            </button>
          )}
          {isCurrentlyHardBanned ? (
            <form action={clearHardBan}>
              <input type="hidden" name="steamid" value={targetSteamid} />
              <button
                type="submit"
                className="rounded border border-emerald-500/60 bg-emerald-500/15 px-2 py-0.5 text-emerald-200 hover:bg-emerald-500/25"
                title="Remove the hard ban — Steam ID can sign in again"
              >
                Clear hard ban
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="rounded border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-red-200 hover:bg-red-500/20"
              onClick={() => setOpen(open === "hardban" ? null : "hardban")}
              title="Block this Steam ID from signing in entirely"
            >
              Hard ban
            </button>
          )}
        </>
      )}

      {open && (
        <div className="mt-1 w-full rounded-md border border-border bg-black/60 p-2">
          <ModActionForm
            variant={open}
            targetSteamid={targetSteamid}
            onDone={() => setOpen(null)}
          />
        </div>
      )}
    </div>
  );
}

function ModActionForm({
  variant,
  targetSteamid,
  onDone,
}: {
  variant: "ban" | "mute" | "warn" | "hardban";
  targetSteamid: string;
  onDone: () => void;
}) {
  const label =
    variant === "ban"
      ? "Ban"
      : variant === "mute"
        ? "Mute"
        : variant === "hardban"
          ? "Hard ban"
          : "Warn";
  const action =
    variant === "ban"
      ? banUser
      : variant === "mute"
        ? muteUser
        : variant === "hardban"
          ? hardBanUser
          : warnUser;

  const reasonName = variant === "warn" ? "note" : "reason";
  const accent =
    variant === "ban" || variant === "hardban"
      ? "bg-red-500/80 hover:bg-red-500 text-foreground"
      : variant === "mute"
        ? "bg-sky-500/80 hover:bg-sky-500 text-black"
        : "bg-amber-500/80 hover:bg-amber-500 text-black";
  const needsDuration = variant === "ban" || variant === "mute";

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2"
      onSubmit={() => window.setTimeout(onDone, 0)}
    >
      <input type="hidden" name="steamid" value={targetSteamid} />
      {needsDuration && (
        <select
          name="duration"
          defaultValue="7"
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        >
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        name={reasonName}
        placeholder={
          variant === "warn"
            ? "Warning note"
            : variant === "hardban"
              ? "Hard-ban reason"
              : "Reason (optional)"
        }
        className="flex-1 min-w-[12ch] rounded border border-border bg-background px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className={cn("rounded px-2 py-1 text-xs font-medium", accent)}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-[10px] text-foreground/40 hover:text-foreground"
      >
        cancel
      </button>
    </form>
  );
}
