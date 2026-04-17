import { ROLE_LABELS, ROLE_STYLES } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  className,
}: {
  role: UserRole | string | null | undefined;
  className?: string;
}) {
  const normalized = (
    role && (["user", "moderator", "elite_moderator", "creator"] as const).includes(
      role as UserRole,
    )
      ? (role as UserRole)
      : "user"
  );
  // Hide the "User" badge by default — it's noise on every byline.
  if (normalized === "user") return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        ROLE_STYLES[normalized].badge,
        className,
      )}
    >
      {ROLE_LABELS[normalized]}
    </span>
  );
}
