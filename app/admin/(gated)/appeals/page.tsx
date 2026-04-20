import Image from "next/image";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db/client";
import {
  dismissAgeGateAppeal,
  grantAgeGateAppeal,
} from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { UserRole } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

interface PendingAppeal {
  steamid: string;
  personaName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  hardBanned: boolean;
  steamCreatedAt: Date | null;
  appealBody: string | null;
  appealCreatedAt: Date;
  handledAt: Date | null;
}

async function getPendingAppeals(): Promise<PendingAppeal[]> {
  const db = getDb();
  // Appeals are stored as broadcast notifications (type = mod_age_gate_appeal).
  // The appellant's steamid lives in the link as `?steamid=<id>` and the body
  // is their written reason. One user can have N broadcasts (one per mod they
  // broadcast to), and may also re-appeal after a dismissal, so we pick the
  // latest row per distinct steamid.
  //
  // Filtering:
  //   - user not hard-banned (hard ban blocks sign-in anyway, nothing to do)
  //   - user not already bypassed (already handled)
  //   - appeal was submitted AFTER any prior dismissal (handledAt) — so a
  //     re-appeal resurfaces the case
  const rows = await db
    .select({
      steamid: users.steamid,
      personaName: users.personaName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      hardBanned: users.hardBanned,
      steamCreatedAt: users.steamCreatedAt,
      handledAt: users.ageGateAppealHandledAt,
      appealBody: sql<string | null>`(
        SELECT n.body FROM notifications n
        WHERE n.type = 'mod_age_gate_appeal'
          AND n.link LIKE '%steamid=' || ${users.steamid} || '%'
        ORDER BY n.created_at DESC
        LIMIT 1
      )`,
      appealCreatedAt: sql<Date>`(
        SELECT n.created_at FROM notifications n
        WHERE n.type = 'mod_age_gate_appeal'
          AND n.link LIKE '%steamid=' || ${users.steamid} || '%'
        ORDER BY n.created_at DESC
        LIMIT 1
      )`,
    })
    .from(users)
    .where(
      and(
        eq(users.hardBanned, false),
        eq(users.bypassAgeGate, false),
        sql`EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.type = 'mod_age_gate_appeal'
            AND n.link LIKE '%steamid=' || ${users.steamid} || '%'
            AND (${users.ageGateAppealHandledAt} IS NULL
                 OR n.created_at > ${users.ageGateAppealHandledAt})
        )`,
      ),
    )
    .orderBy(
      desc(sql`(
        SELECT MAX(n.created_at) FROM notifications n
        WHERE n.type = 'mod_age_gate_appeal'
          AND n.link LIKE '%steamid=' || ${users.steamid} || '%'
      )`),
    );
  return rows.map((r) => ({
    ...r,
    role: (r.role as UserRole) ?? "user",
  }));
}

export default async function AppealsAdminPage() {
  const pending = await getPendingAppeals();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Age-gate appeals</h1>
        <p className="text-sm text-foreground/60">
          Users whose Steam profile is private hit the 7-day account-age gate
          with no way out. This queue is what they see from{" "}
          <code className="rounded bg-black/30 px-1">/verify/appeal</code>.
          Grant to flip{" "}
          <code className="rounded bg-black/30 px-1">bypass_age_gate</code> on
          their row; dismiss to mark the request handled without flipping the
          gate.
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
          No pending appeals.
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((a) => (
            <li key={a.steamid}>
              <AppealCard appeal={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppealCard({ appeal }: { appeal: PendingAppeal }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row">
      <div className="flex shrink-0 items-start gap-3 sm:w-56">
        {appeal.avatarUrl ? (
          <Image
            src={appeal.avatarUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="size-12 rounded-full border border-foreground/10"
          />
        ) : (
          <div className="size-12 rounded-full bg-foreground/10" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <UserName
              name={appeal.personaName ?? "(unknown)"}
              role={appeal.role}
              steamid={appeal.steamid}
            />
            <RoleBadge role={appeal.role} />
          </div>
          <div className="mt-1 font-mono text-[10px] text-foreground/40">
            {appeal.steamid}
          </div>
          <div className="mt-0.5 text-[10px] text-foreground/50">
            Appealed {appeal.appealCreatedAt.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-foreground/50">
            Steam age:{" "}
            {appeal.steamCreatedAt
              ? appeal.steamCreatedAt.toLocaleDateString()
              : "private profile"}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {appeal.appealBody ? (
          <p className="whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 text-sm text-foreground/80">
            {appeal.appealBody}
          </p>
        ) : (
          <p className="rounded border border-border bg-background px-3 py-2 text-xs italic text-foreground/40">
            No reason attached (older appeal).
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/profile/${appeal.steamid}`}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/60 hover:border-accent hover:text-accent"
            title="Open the profile to sanity-check before granting"
          >
            Profile →
          </Link>
          <form action={dismissAgeGateAppeal} className="inline">
            <input type="hidden" name="steamid" value={appeal.steamid} />
            <FormSubmitButton
              pendingLabel="Dismissing…"
              toastSuccess="Appeal dismissed."
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/60 hover:border-red-400 hover:text-red-300"
              title="Mark handled without flipping the gate — user can re-appeal after 24 h"
            >
              Dismiss
            </FormSubmitButton>
          </form>
          <form action={grantAgeGateAppeal} className="inline">
            <input type="hidden" name="steamid" value={appeal.steamid} />
            <FormSubmitButton
              pendingLabel="Granting…"
              toastSuccess="Age gate opened for this user."
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-400"
            >
              Grant bypass
            </FormSubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
