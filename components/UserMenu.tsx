import Image from "next/image";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { effectiveRole, ROLE_STYLES } from "@/lib/auth/roles";
import type { User, UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { isModerator } from "@/lib/auth/roles";
import { isBanned } from "@/lib/auth/session";

export function UserMenu({ user }: { user: User }) {
  // effectiveRole collapses to null when the user is currently banned —
  // banned users get ghost-level privileges in the UI.
  const role = effectiveRole(user);
  const banned = isBanned(user);
  const displayRole = role ?? ((user.role as UserRole) ?? "user");
  const style = ROLE_STYLES[displayRole] ?? ROLE_STYLES.user;

  return (
    <div className="flex items-center gap-3 text-sm">
      {!banned && (
        <>
          <Link
            href="/submit"
            className="hidden text-white/60 hover:text-white sm:inline"
          >
            Submit
          </Link>
          <Link
            href="/me/favourites"
            className="hidden text-white/60 hover:text-white sm:inline"
          >
            Favourites
          </Link>
        </>
      )}
      {isModerator(role) && (
        <Link
          href="/admin/triage"
          className="hidden text-white/60 hover:text-white sm:inline"
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
                : "border-white/10",
            )}
          />
        ) : (
          <div className="size-7 rounded-full bg-white/10" />
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
      <form action="/auth/logout" method="post">
        <button
          type="submit"
          className="text-xs text-white/40 hover:text-white/70"
          title="Sign out"
        >
          sign out
        </button>
      </form>
    </div>
  );
}
