import Image from "next/image";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import {
  effectiveRole,
  isCreator,
  isEliteModerator,
  isModerator,
  ROLE_STYLES,
} from "@/lib/auth/roles";
import type { NotificationTier, User, UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { isBanned } from "@/lib/auth/session";

type TierStyle = {
  /** tier as it appears in the URL query + DB column */
  tier: NotificationTier;
  /** bell tint when there are unread notifications */
  activeClass: string;
  /** bell tint when empty */
  idleClass: string;
  /** badge background colour */
  badgeClass: string;
  label: string;
};

const TIER_STYLES: Record<NotificationTier, TierStyle> = {
  user: {
    tier: "user",
    activeClass: "text-foreground/80",
    idleClass: "text-foreground/50 hover:text-foreground",
    badgeClass: "bg-foreground text-background",
    label: "Personal notifications",
  },
  moderator: {
    tier: "moderator",
    activeClass: "text-sky-300",
    idleClass: "text-sky-400/40 hover:text-sky-300",
    badgeClass: "bg-sky-400 text-black",
    label: "Moderator notifications",
  },
  elite_moderator: {
    tier: "elite_moderator",
    activeClass: "text-amber-300",
    idleClass: "text-amber-400/40 hover:text-amber-300",
    badgeClass: "bg-amber-400 text-black",
    label: "Elite moderator notifications",
  },
  creator: {
    tier: "creator",
    activeClass: "text-purple-300",
    idleClass: "text-purple-400/40 hover:text-purple-300",
    badgeClass: "bg-purple-400 text-black",
    label: "Creator notifications",
  },
};

export function UserMenu({
  user,
  unreadByTier,
}: {
  user: User;
  unreadByTier: Record<NotificationTier, number>;
}) {
  const role = effectiveRole(user);
  const banned = isBanned(user);
  const displayRole = role ?? ((user.role as UserRole) ?? "user");
  const style = ROLE_STYLES[displayRole] ?? ROLE_STYLES.user;

  const visibleTiers: NotificationTier[] = ["user"];
  if (isModerator(role)) visibleTiers.push("moderator");
  if (isEliteModerator(role)) visibleTiers.push("elite_moderator");
  if (isCreator(role)) visibleTiers.push("creator");

  return (
    <div className="flex items-center gap-2 text-sm sm:gap-3">
      {!banned && (
        <>
          <Link
            href="/submit"
            className="text-foreground/60 hover:text-foreground"
            title="Submit"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 sm:hidden"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">Submit</span>
          </Link>
          <Link
            href="/me/favourites"
            className="text-foreground/60 hover:text-foreground"
            title="Favourites"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 sm:hidden"
              aria-hidden
            >
              <path d="M9.653 17.482l-.006-.004-.018-.01a22.37 22.37 0 0 1-.317-.192 23.81 23.81 0 0 1-3.699-2.927C3.653 12.61 2 10.22 2 7.5A4.5 4.5 0 0 1 10 4.635 4.5 4.5 0 0 1 18 7.5c0 2.72-1.653 5.11-3.613 6.85a23.81 23.81 0 0 1-3.699 2.926 22.21 22.21 0 0 1-.343.202l-.007.005-.002.001a.752.752 0 0 1-.683-.002z" />
            </svg>
            <span className="hidden sm:inline">Favourites</span>
          </Link>
          {visibleTiers.map((t) => (
            <TierBell
              key={t}
              tier={t}
              unread={unreadByTier[t] ?? 0}
            />
          ))}
        </>
      )}
      {isModerator(role) && (
        <Link
          href="/admin/triage"
          className="hidden text-foreground/60 hover:text-foreground sm:inline"
        >
          Admin
        </Link>
      )}
      <Link
        href={`/profile/${user.steamid}`}
        className="group flex items-center gap-2"
        title={
          banned
            ? `${user.personaName} — banned`
            : `${user.personaName} (${displayRole})`
        }
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className={cn(
              "size-7 rounded-full border",
              banned
                ? "border-red-500/70 opacity-60 grayscale"
                : "border-foreground/10",
            )}
          />
        ) : (
          <div className="size-7 rounded-full bg-foreground/10" />
        )}
        <span
          className={cn(
            "hidden max-w-[140px] truncate font-medium group-hover:underline sm:inline",
            banned ? "text-red-300 line-through" : style.name,
          )}
        >
          {user.personaName}
        </span>
        {banned ? (
          <span className="rounded-full border border-red-500/50 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-200">
            Banned
          </span>
        ) : (
          <RoleBadge role={displayRole} className="hidden md:inline-flex" />
        )}
      </Link>
      <form action="/auth/logout" method="post" className="hidden sm:block">
        <button
          type="submit"
          className="text-xs text-foreground/40 hover:text-foreground/70"
          title="Sign out"
        >
          sign out
        </button>
      </form>
    </div>
  );
}

function TierBell({
  tier,
  unread,
}: {
  tier: NotificationTier;
  unread: number;
}) {
  const style = TIER_STYLES[tier];
  const tone = unread > 0 ? style.activeClass : style.idleClass;
  return (
    <Link
      href={tier === "user" ? "/me/notifications" : `/me/notifications?tier=${tier}`}
      className={cn("relative transition", tone)}
      title={style.label}
      aria-label={
        unread > 0
          ? `${style.label} — ${unread} unread`
          : style.label
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="size-5"
        aria-hidden
      >
        <path d="M10 2a6 6 0 0 0-6 6v2.586l-.707.707A1 1 0 0 0 4 13h12a1 1 0 0 0 .707-1.707L16 10.586V8a6 6 0 0 0-6-6zM10 18a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 10 18z" />
      </svg>
      {unread > 0 && (
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
            style.badgeClass,
          )}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
