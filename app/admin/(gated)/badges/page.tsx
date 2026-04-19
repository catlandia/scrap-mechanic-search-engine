import { inArray } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import {
  addInfluencerAutograntAction,
  removeInfluencerAutograntAction,
} from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { isCreator } from "@/lib/auth/roles";
import {
  AUTOGRANT_BADGES,
  BADGES,
} from "@/lib/badges/definitions";
import { listAutogrants } from "@/lib/badges/queries";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import { UserName } from "@/components/UserName";

export const dynamic = "force-dynamic";

export default async function BadgesAdminPage() {
  const viewer = await getCurrentUser();
  if (!isCreator(viewer?.role as UserRole | undefined)) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-red-200">Creator only.</div>
        <p className="mt-2 text-red-100/80">
          Badge autogrant management is restricted to the Creator tier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Badge autogrants</h1>
        <p className="text-sm text-foreground/60">
          Badges listed here get auto-granted to specific users at sign-in.
          Date-based auto-badges (like Beta tester) are not managed here —
          they apply automatically by rule. Per-user manual grants happen on{" "}
          <Link href="/admin/users" className="text-accent hover:underline">
            /admin/users
          </Link>
          .
        </p>
      </header>

      {AUTOGRANT_BADGES.map((slug) => {
        const def = BADGES[slug];
        if (!def) return null;
        return <AutograntSection key={slug} slug={slug} />;
      })}
    </div>
  );
}

async function AutograntSection({ slug }: { slug: string }) {
  const def = BADGES[slug];
  if (!def) return null;

  const rows = await listAutogrants(slug);
  const steamids = rows.map((r) => r.steamid);
  const userRows =
    steamids.length > 0
      ? await getDb()
          .select({
            steamid: users.steamid,
            personaName: users.personaName,
            avatarUrl: users.avatarUrl,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.steamid, steamids))
      : [];
  const byId = new Map(userRows.map((u) => [u.steamid, u]));

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${def.pill}`}
        >
          <span aria-hidden>{def.icon}</span>
          <span>{def.name}</span>
        </span>
        <span className="text-xs text-foreground/50">{def.description}</span>
      </header>

      <form
        action={addInfluencerAutograntAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card/60 p-3"
      >
        <input type="hidden" name="slug" value={slug} />
        <label className="flex-1 min-w-[14rem] space-y-1">
          <span className="block text-xs text-foreground/60">
            Steam profile URL, vanity URL, or Steam64 ID
          </span>
          <input
            type="text"
            name="input"
            required
            placeholder="https://steamcommunity.com/id/glykaman"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex-1 min-w-[14rem] space-y-1">
          <span className="block text-xs text-foreground/60">
            Note (optional, shows on the row so you remember who they are)
          </span>
          <input
            type="text"
            name="label"
            placeholder="glykaman — youtube.com/@..."
            maxLength={200}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Add
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-foreground/60">
          No one on the list yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const user = byId.get(r.steamid) ?? null;
            return (
              <li
                key={r.steamid}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
              >
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="size-8 shrink-0 rounded-full border border-foreground/10"
                  />
                ) : (
                  <div className="size-8 shrink-0 rounded-full bg-foreground/10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {user ? (
                      <UserName
                        name={user.personaName}
                        role={user.role as UserRole}
                        steamid={user.steamid}
                        bold
                      />
                    ) : (
                      <span className="text-sm italic text-foreground/50">
                        hasn&apos;t signed in yet
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-foreground/40">
                      {r.steamid}
                    </span>
                  </div>
                  {r.label && (
                    <div className="text-xs text-foreground/60">{r.label}</div>
                  )}
                  <div className="text-[10px] text-foreground/40">
                    added {new Date(r.addedAt).toLocaleDateString()}
                  </div>
                </div>
                <form action={removeInfluencerAutograntAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="steamid" value={r.steamid} />
                  <button
                    type="submit"
                    className="rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground/60 hover:border-red-500/60 hover:text-red-300"
                    title="Remove from autogrant list (does not revoke existing grant)"
                  >
                    Remove
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
