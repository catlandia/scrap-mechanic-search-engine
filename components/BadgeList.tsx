import { cn } from "@/lib/utils";
import type { BadgeDef } from "@/lib/badges/definitions";

// Compact inline pills. `size="inline"` sits next to names without reflow;
// `size="card"` is for profile pages where the description is useful.
export function BadgeList({
  badges,
  size = "inline",
  className,
}: {
  badges: BadgeDef[];
  size?: "inline" | "card";
  className?: string;
}) {
  if (badges.length === 0) return null;
  if (size === "card") {
    return (
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {badges.map((b) => (
          <li
            key={b.slug}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
              b.pill,
            )}
            title={b.description}
          >
            <span aria-hidden className="text-sm">
              {b.icon}
            </span>
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-[10px] opacity-80">{b.description}</div>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.slug}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
            b.pill,
          )}
          title={`${b.name} — ${b.description}`}
        >
          <span aria-hidden>{b.icon}</span>
          <span>{b.name}</span>
        </span>
      ))}
    </span>
  );
}
