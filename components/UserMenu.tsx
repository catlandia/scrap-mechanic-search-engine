import Image from "next/image";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { ROLE_STYLES } from "@/lib/auth/roles";
import type { User, UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { isModerator } from "@/lib/auth/roles";

export function UserMenu({ user }: { user: User }) {
  const role = user.role as UserRole;
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.user;

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/me/favourites"
        className="hidden text-white/60 hover:text-white sm:inline"
      >
        Favourites
      </Link>
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
        title={`${user.personaName} (${role})`}
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="size-7 rounded-full border border-white/10"
          />
        ) : (
          <div className="size-7 rounded-full bg-white/10" />
        )}
        <span
          className={cn(
            "hidden max-w-[140px] truncate font-medium group-hover:underline sm:inline",
            style.name,
          )}
        >
          {user.personaName}
        </span>
        <RoleBadge role={role} className="hidden md:inline-flex" />
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
