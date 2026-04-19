import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, type UserRole } from "@/lib/db/schema";
import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import { ProfileFavourites } from "@/components/profile/ProfileFavourites";
import { SubmittedItems } from "@/components/profile/SubmittedItems";
import { VoteHistory } from "@/components/profile/VoteHistory";
import { ROLE_LABELS, ROLE_STYLES } from "@/lib/auth/roles";
import { CommentSection } from "@/components/CommentSection";
import { getProfileComments } from "@/lib/db/queries";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { isModerator } from "@/lib/auth/roles";
import { canSeeModInfo } from "@/lib/auth/viewer-is";

export const dynamic = "force-dynamic";

type Params = Promise<{ steamid: string }>;

async function loadUser(steamid: string) {
  if (!/^\d{1,25}$/.test(steamid)) return null;
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.steamid, steamid)).limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { steamid } = await params;
  const user = await loadUser(steamid);
  if (!user) return { robots: { index: false, follow: false } };
  return {
    title: `${user.personaName} — profile`,
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { steamid } = await params;
  const user = await loadUser(steamid);
  if (!user) notFound();

  const viewer = await getCurrentUser();
  const showModInfo = canSeeModInfo(viewer, user.steamid);

  const role = user.role as UserRole;
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.user;

  let playtimeLabel: string;
  if (user.smPlaytimeMinutes == null) {
    playtimeLabel = "hidden by Steam profile";
  } else {
    const hours = Math.floor(user.smPlaytimeMinutes / 60);
    const minutes = user.smPlaytimeMinutes % 60;
    playtimeLabel = hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
  }

  const safeProfileUrl =
    user.profileUrl && user.profileUrl.startsWith("https://")
      ? user.profileUrl
      : null;

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="size-24 rounded-lg border border-foreground/10"
          />
        ) : (
          <div className="size-24 rounded-lg bg-foreground/5" />
        )}
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold ${style.name}`}>
            <UserName name={user.personaName} role={role} bold />
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
            <RoleBadge role={role} />
            {role === "user" && (
              <span className="rounded-full border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
                {ROLE_LABELS.user}
              </span>
            )}
            {safeProfileUrl && (
              <a
                href={safeProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Steam profile ↗
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Site ID" value={`#${user.shortId}`} mono />
        <Stat label="On the site since" value={user.siteJoinedAt?.toLocaleDateString() ?? "—"} />
        {showModInfo && (
          <Stat
            label="Steam account since"
            value={user.steamCreatedAt?.toLocaleDateString() ?? "hidden"}
          />
        )}
        <Stat label="Scrap Mechanic playtime" value={playtimeLabel} />
        <Stat label="SteamID64" value={user.steamid} mono />
      </section>

      {showModInfo &&
        (user.bannedUntil || user.mutedUntil || user.hardBanned || (user.warningsCount ?? 0) > 0) && (
          <section className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-widest text-amber-200">
              Moderation status
            </div>
            {user.hardBanned && (
              <div className="text-red-300">
                🔒 Hard-banned — this Steam ID is blocked from signing in.
                {user.banReason ? ` ${user.banReason}` : ""}
              </div>
            )}
            {!user.hardBanned && user.bannedUntil && user.bannedUntil > new Date() && (
              <div className="text-red-300">
                Banned until {user.bannedUntil.toLocaleString()}
                {user.banReason ? ` — ${user.banReason}` : "."}
              </div>
            )}
            {user.mutedUntil && user.mutedUntil > new Date() && (
              <div className="text-sky-300">
                Muted until {user.mutedUntil.toLocaleString()}
                {user.muteReason ? ` — ${user.muteReason}` : "."}
              </div>
            )}
            {(user.warningsCount ?? 0) > 0 && (
              <div className="text-amber-300">
                {user.warningsCount} warning{user.warningsCount === 1 ? "" : "s"}
                {user.warningNote ? ` — ${user.warningNote}` : "."}
              </div>
            )}
          </section>
        )}

      <SubmittedItems steamid={user.steamid} />
      <ProfileFavourites steamid={user.steamid} />
      <VoteHistory
        steamid={user.steamid}
        viewerSteamid={viewer?.steamid ?? null}
      />

      <CommentSection
        target={{ kind: "profile", profileSteamid: user.steamid }}
        comments={await getProfileComments(user.steamid, viewer?.steamid ?? null)}
        viewerSteamid={viewer?.steamid ?? null}
        viewerIsMod={isModerator(viewer?.role as UserRole | undefined)}
        viewerCanPost={!!viewer && !isBanned(viewer) && !isMuted(viewer)}
        heading="Profile wall"
      />
    </article>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</div>
      <div
        className={`mt-0.5 ${mono ? "font-mono text-[11px]" : "text-base"} text-foreground`}
      >
        {value}
      </div>
    </div>
  );
}
