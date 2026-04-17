import Link from "next/link";
import { ROLE_STYLES } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/**
 * Renders a user's display name with role-appropriate colour (creator = purple,
 * elite mod = amber, mod = sky, user = default). If `href` or `steamid` is
 * supplied, wraps the name in a Link to the profile.
 */
export function UserName({
  name,
  role,
  steamid,
  className,
  bold = false,
}: {
  name: string;
  role: UserRole | string | null | undefined;
  steamid?: string | null;
  className?: string;
  bold?: boolean;
}) {
  const normalizedRole = (
    role && (["user", "moderator", "elite_moderator", "creator"] as const).includes(
      role as UserRole,
    )
      ? (role as UserRole)
      : "user"
  );
  const style = ROLE_STYLES[normalizedRole];
  const classes = cn(style.name, bold && "font-medium", className);

  if (steamid) {
    return (
      <Link href={`/profile/${steamid}`} className={cn(classes, "hover:underline")}>
        {name}
      </Link>
    );
  }
  return <span className={classes}>{name}</span>;
}
