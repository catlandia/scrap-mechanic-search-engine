import type { UserRole } from "@/lib/db/schema";

export const ROLE_HIERARCHY: UserRole[] = [
  "user",
  "moderator",
  "elite_moderator",
  "creator",
];

export function roleRank(role: UserRole | null | undefined): number {
  if (!role) return -1;
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx < 0 ? -1 : idx;
}

export function hasRoleAtLeast(
  role: UserRole | null | undefined,
  min: UserRole,
): boolean {
  return roleRank(role) >= roleRank(min);
}

export const isUser = (r: UserRole | null | undefined) => hasRoleAtLeast(r, "user");
export const isModerator = (r: UserRole | null | undefined) =>
  hasRoleAtLeast(r, "moderator");
export const isEliteModerator = (r: UserRole | null | undefined) =>
  hasRoleAtLeast(r, "elite_moderator");
export const isCreator = (r: UserRole | null | undefined) => r === "creator";

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  moderator: "Moderator",
  elite_moderator: "Elite Moderator",
  creator: "Creator",
};

export interface RoleStyle {
  /** Tailwind class applied to a user's display name anywhere on the site. */
  name: string;
  /** Tailwind classes for the role badge pill. */
  badge: string;
}

export const ROLE_STYLES: Record<UserRole, RoleStyle> = {
  user: {
    name: "text-white/80",
    badge: "bg-white/10 text-white/60 border border-white/10",
  },
  moderator: {
    name: "text-sky-300",
    badge: "bg-sky-500/20 text-sky-200 border border-sky-500/40",
  },
  elite_moderator: {
    name: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
  },
  creator: {
    name: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-200 border border-purple-500/40",
  },
};
