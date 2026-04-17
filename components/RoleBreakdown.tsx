import type { RoleVoteBreakdown } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

/**
 * Compact pill row showing how many moderators / elite mods / the creator
 * voted on a thing. Hidden entirely when no elevated-role vote exists.
 */
export function RoleBreakdown({
  breakdown,
  direction,
  className,
}: {
  breakdown: RoleVoteBreakdown;
  direction: "up" | "down" | "both";
  className?: string;
}) {
  const showUp = direction !== "down";
  const showDown = direction !== "up";

  const pills: { key: string; label: string; classes: string; count: number }[] = [];

  if (showUp) {
    if (breakdown.modUp > 0)
      pills.push({
        key: "mod-up",
        label: `${breakdown.modUp} mod${breakdown.modUp === 1 ? "" : "s"} ↑`,
        classes: "bg-sky-500/15 text-sky-200 border-sky-500/30",
        count: breakdown.modUp,
      });
    if (breakdown.eliteUp > 0)
      pills.push({
        key: "elite-up",
        label: `${breakdown.eliteUp} elite ↑`,
        classes: "bg-amber-500/15 text-amber-200 border-amber-500/30",
        count: breakdown.eliteUp,
      });
    if (breakdown.creatorUp > 0)
      pills.push({
        key: "creator-up",
        label: "creator ↑",
        classes: "bg-purple-500/15 text-purple-200 border-purple-500/30",
        count: breakdown.creatorUp,
      });
  }

  if (showDown) {
    if (breakdown.modDown > 0)
      pills.push({
        key: "mod-down",
        label: `${breakdown.modDown} mod${breakdown.modDown === 1 ? "" : "s"} ↓`,
        classes: "bg-sky-500/10 text-sky-200/70 border-sky-500/20",
        count: breakdown.modDown,
      });
    if (breakdown.eliteDown > 0)
      pills.push({
        key: "elite-down",
        label: `${breakdown.eliteDown} elite ↓`,
        classes: "bg-amber-500/10 text-amber-200/70 border-amber-500/20",
        count: breakdown.eliteDown,
      });
    if (breakdown.creatorDown > 0)
      pills.push({
        key: "creator-down",
        label: "creator ↓",
        classes: "bg-purple-500/10 text-purple-200/70 border-purple-500/20",
        count: breakdown.creatorDown,
      });
  }

  if (pills.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {pills.map((p) => (
        <span
          key={p.key}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            p.classes,
          )}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

export function breakdownTitle(
  breakdown: RoleVoteBreakdown,
  direction: "up" | "down" | "both",
): string {
  const parts: string[] = [];
  if (direction !== "down") {
    const up: string[] = [];
    if (breakdown.userUp) up.push(`${breakdown.userUp} user${breakdown.userUp === 1 ? "" : "s"}`);
    if (breakdown.modUp) up.push(`${breakdown.modUp} mod${breakdown.modUp === 1 ? "" : "s"}`);
    if (breakdown.eliteUp) up.push(`${breakdown.eliteUp} elite`);
    if (breakdown.creatorUp) up.push("creator");
    if (up.length) parts.push(`↑ ${up.join(", ")}`);
  }
  if (direction !== "up") {
    const down: string[] = [];
    if (breakdown.userDown)
      down.push(`${breakdown.userDown} user${breakdown.userDown === 1 ? "" : "s"}`);
    if (breakdown.modDown)
      down.push(`${breakdown.modDown} mod${breakdown.modDown === 1 ? "" : "s"}`);
    if (breakdown.eliteDown) down.push(`${breakdown.eliteDown} elite`);
    if (breakdown.creatorDown) down.push("creator");
    if (down.length) parts.push(`↓ ${down.join(", ")}`);
  }
  return parts.join(" · ");
}
