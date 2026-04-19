import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isBanned } from "@/lib/auth/session";
import {
  effectiveRole,
  isCreator,
  isModerator,
  ROLE_LABELS,
} from "@/lib/auth/roles";
import { RoleBadge } from "@/components/RoleBadge";
import type { UserRole } from "@/lib/db/schema";

const baseNav = [
  { href: "/admin/triage", label: "Triage" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/archive", label: "Archive" },
  { href: "/admin/add", label: "Add" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/ingest", label: "Ingest" },
  { href: "/admin/guide", label: "Guide" },
];
const creatorNav = [
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/admin/triage");
  const banned = isBanned(user);
  const role = effectiveRole(user);

  if (banned) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Access suspended.</div>
        <p className="mt-2 text-red-100/80">
          Your account is currently banned
          {user.bannedUntil
            ? ` until ${user.bannedUntil.toLocaleString()}`
            : ""}
          . While the ban is active you have ghost privileges — no admin
          tools, no voting, no commenting.
        </p>
      </div>
    );
  }

  if (!isModerator(role)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Not allowed.</div>
        <p className="mt-2 text-red-100/80">
          You&apos;re signed in as{" "}
          <span className="font-medium">{user.personaName}</span> (
          {ROLE_LABELS[(user.role as UserRole) ?? "user"] ?? "User"}). Only
          moderators and above can access admin tools.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-6">
          <span className="text-sm uppercase tracking-widest text-accent">Admin</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {baseNav.map((item) => (
              <Link key={item.href} href={item.href} className="text-foreground/70 hover:text-foreground">
                {item.label}
              </Link>
            ))}
            {isCreator(role) &&
              creatorNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-purple-300 hover:text-purple-200"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground/50">
          <RoleBadge role={role ?? (user.role as UserRole)} />
          <span>{user.personaName}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
