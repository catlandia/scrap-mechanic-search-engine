import Image from "next/image";
import { desc } from "drizzle-orm";
import {
  grantBadgeAction,
  revokeBadgeAction,
  setUserRole,
} from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import {
  isCreator,
  isEliteModerator,
  ROLE_LABELS,
  ROLE_STYLES,
} from "@/lib/auth/roles";
import { BADGES, SYSTEM_AUTO_BADGES } from "@/lib/badges/definitions";
import { getBadgesForSteamIds } from "@/lib/badges/queries";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { UserModForms } from "@/components/UserModForms";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const dynamic = "force-dynamic";

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "moderator", label: "Moderator" },
  { value: "elite_moderator", label: "Elite Moderator" },
];

export default async function UsersAdminPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">
          Creator only.
        </div>
        <p className="mt-2 text-red-100/80">
          Role management is restricted to the Creator tier. Moderators and
          Elite Moderators cannot grant or revoke roles.
        </p>
      </div>
    );
  }

  const db = getDb();
  const rows = await db.select().from(users).orderBy(desc(users.siteJoinedAt));
  const badgesByUser = await getBadgesForSteamIds(rows.map((u) => u.steamid));

  const byRole: Record<UserRole, typeof rows> = {
    creator: [],
    elite_moderator: [],
    moderator: [],
    user: [],
  };
  for (const r of rows) {
    const role = r.role as UserRole;
    (byRole[role] ??= []).push(r);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Users & roles</h1>
        <p className="text-sm text-foreground/60">
          Grant or revoke Moderator / Elite Moderator. The Creator role is
          anchored by the <code className="rounded bg-black/40 px-1">CREATOR_STEAMID</code>
          {" "}env var and can&apos;t be changed from the UI. Your own role is
          locked on this page.
        </p>
      </header>

      {/* overflow-x-auto lets mobile users swipe sideways to reach ban/mute/
          hard-ban buttons without rotating the phone. min-w guarantees the
          table keeps a usable layout even on very narrow viewports. */}
      <section className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Joined site</th>
              <th className="px-3 py-2 text-right">Change role</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-foreground/50">
                  No users yet.
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const role = u.role as UserRole;
              const isSelf = u.steamid === viewer!.steamid;
              const isTargetCreator = role === "creator";
              const rowStyle = ROLE_STYLES[role] ?? ROLE_STYLES.user;
              return (
                <tr key={u.steamid} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="size-7 rounded-full border border-foreground/10"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-foreground/10" />
                      )}
                      <div className="flex min-w-0 flex-col">
                        <UserName
                          name={u.personaName}
                          role={role}
                          steamid={u.steamid}
                          bold
                        />
                        <span className="font-mono text-[10px] text-foreground/35">
                          #{u.shortId} · {u.steamid}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-2 ${rowStyle.name}`}>
                    <RoleBadge role={role} />
                    {role === "user" && (
                      <span className="ml-1 text-xs text-foreground/50">
                        {ROLE_LABELS.user}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/50">
                    {u.siteJoinedAt?.toLocaleDateString() ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isTargetCreator ? (
                      <span className="text-xs text-foreground/40">
                        Creator role — immutable
                      </span>
                    ) : isSelf ? (
                      <span className="text-xs text-foreground/40">That&apos;s you</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <form
                          action={setUserRole}
                          className="flex items-center justify-end gap-2"
                        >
                          <input type="hidden" name="steamid" value={u.steamid} />
                          <select
                            name="role"
                            defaultValue={role}
                            className="rounded border border-border bg-background px-2 py-1 text-sm"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <FormSubmitButton
                            pendingLabel="Saving…"
                            toastSuccess="Role updated."
                            className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-black hover:bg-accent-strong"
                          >
                            Save
                          </FormSubmitButton>
                        </form>
                        <UserModForms
                          targetSteamid={u.steamid}
                          viewerIsCreator={isCreator(viewer!.role as UserRole)}
                          viewerIsEliteOrCreator={isEliteModerator(
                            viewer!.role as UserRole,
                          )}
                          isCurrentlyBanned={
                            !!(u.bannedUntil && u.bannedUntil > new Date())
                          }
                          isCurrentlyMuted={
                            !!(u.mutedUntil && u.mutedUntil > new Date())
                          }
                          isCurrentlyHardBanned={!!u.hardBanned}
                          warningsCount={u.warningsCount ?? 0}
                          bypassAgeGate={!!u.bypassAgeGate}
                        />
                        <BadgeManager
                          steamid={u.steamid}
                          granted={badgesByUser.get(u.steamid) ?? []}
                        />
                        {u.bannedUntil && u.bannedUntil > new Date() && (
                          <div className="text-[10px] text-red-300">
                            banned until {u.bannedUntil.toLocaleDateString()}
                          </div>
                        )}
                        {u.mutedUntil && u.mutedUntil > new Date() && (
                          <div className="text-[10px] text-sky-300">
                            muted until {u.mutedUntil.toLocaleDateString()}
                          </div>
                        )}
                        {(u.warningsCount ?? 0) > 0 && (
                          <div className="text-[10px] text-amber-300">
                            {u.warningsCount} warning{u.warningsCount === 1 ? "" : "s"}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <RoleTotal count={byRole.creator?.length ?? 0} role="creator" />
        <RoleTotal count={byRole.elite_moderator?.length ?? 0} role="elite_moderator" />
        <RoleTotal count={byRole.moderator?.length ?? 0} role="moderator" />
        <RoleTotal count={byRole.user?.length ?? 0} role="user" />
      </section>
    </div>
  );
}

function BadgeManager({
  steamid,
  granted,
}: {
  steamid: string;
  granted: Array<{ slug: string }>;
}) {
  const grantedSlugs = new Set(granted.map((b) => b.slug));
  // System-auto badges (e.g. top_creator) are rewritten from server-side
  // logic every time the catalogue shifts — any manual grant here would
  // be reverted on the next approval, so just hide the button.
  const ungranted = Object.values(BADGES).filter(
    (b) => !grantedSlugs.has(b.slug) && !SYSTEM_AUTO_BADGES.includes(b.slug),
  );
  return (
    <div className="flex flex-col items-end gap-1 border-t border-border/60 pt-1">
      <div className="text-[10px] uppercase tracking-wider text-foreground/40">
        Badges
      </div>
      {granted.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {granted.map((g) => {
            const def = BADGES[g.slug];
            if (!def) return null;
            return (
              <form
                key={g.slug}
                action={revokeBadgeAction}
                className="inline-flex"
              >
                <input type="hidden" name="steamid" value={steamid} />
                <input type="hidden" name="slug" value={g.slug} />
                <FormSubmitButton
                  toastSuccess={`Revoked ${def.name} badge.`}
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] leading-none hover:opacity-70 ${def.pill}`}
                  title={`Click to revoke ${def.name}`}
                >
                  <span aria-hidden>{def.icon}</span>
                  <span>{def.name}</span>
                  <span aria-hidden className="opacity-60">
                    ×
                  </span>
                </FormSubmitButton>
              </form>
            );
          })}
        </div>
      )}
      {ungranted.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {ungranted.map((def) => (
            <form key={def.slug} action={grantBadgeAction} className="inline-flex">
              <input type="hidden" name="steamid" value={steamid} />
              <input type="hidden" name="slug" value={def.slug} />
              <FormSubmitButton
                toastSuccess={`Granted ${def.name} badge.`}
                className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] leading-none text-foreground/60 hover:border-accent hover:text-accent"
                title={`Grant ${def.name} — ${def.description}`}
              >
                <span aria-hidden>+</span>
                <span aria-hidden>{def.icon}</span>
                <span>{def.name}</span>
              </FormSubmitButton>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleTotal({ count, role }: { count: number; role: UserRole }) {
  const style = ROLE_STYLES[role];
  return (
    <div className="rounded-md border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-foreground/40">
        {ROLE_LABELS[role]}
      </div>
      <div className={`mt-0.5 text-xl font-semibold ${style.name}`}>
        {count}
      </div>
    </div>
  );
}
