import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  effectiveRole,
  isCreator,
  isEliteModerator,
  isModerator,
} from "@/lib/auth/roles";
import {
  getUnreadNotificationCountsByTier,
  getUserNotifications,
  markAllNotificationsRead,
} from "@/lib/db/queries";
import {
  NOTIFICATION_TIERS,
  type NotificationTier,
} from "@/lib/db/schema";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const TYPE_ICONS: Record<string, string> = {
  submission_approved: "✅",
  submission_rejected: "❌",
  suggestion_approved: "👍",
  suggestion_rejected: "❌",
  suggestion_implemented: "🎉",
  mod_new_report: "🚩",
  elite_creation_archived: "📦",
  creator_new_suggestion: "💡",
};

const TIER_LABEL: Record<NotificationTier, string> = {
  user: "Personal",
  moderator: "Moderator",
  elite_moderator: "Elite",
  creator: "Creator",
};

const TIER_TAB_TONE: Record<NotificationTier, { active: string; idle: string }> = {
  user: {
    active: "border-foreground text-foreground",
    idle: "border-transparent text-foreground/50 hover:text-foreground",
  },
  moderator: {
    active: "border-sky-300 text-sky-200",
    idle: "border-transparent text-sky-400/50 hover:text-sky-300",
  },
  elite_moderator: {
    active: "border-amber-300 text-amber-200",
    idle: "border-transparent text-amber-400/50 hover:text-amber-300",
  },
  creator: {
    active: "border-purple-300 text-purple-200",
    idle: "border-transparent text-purple-400/50 hover:text-purple-300",
  },
};

type SearchParamsType = Promise<{ tier?: string }>;

function parseTier(raw: string | undefined): NotificationTier {
  if (raw && (NOTIFICATION_TIERS as readonly string[]).includes(raw)) {
    return raw as NotificationTier;
  }
  return "user";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: SearchParamsType;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/me/notifications");

  const sp = await searchParams;
  const requested = parseTier(sp.tier);
  const role = effectiveRole(user);

  const visibleTiers: NotificationTier[] = ["user"];
  if (isModerator(role)) visibleTiers.push("moderator");
  if (isEliteModerator(role)) visibleTiers.push("elite_moderator");
  if (isCreator(role)) visibleTiers.push("creator");

  // If user tries to hit a tier they don't have access to, bounce to their
  // personal feed rather than 404 — less hostile than a hard error.
  const activeTier = visibleTiers.includes(requested) ? requested : "user";

  const [notifications, unreadByTier] = await Promise.all([
    getUserNotifications(user.steamid, 50, activeTier),
    getUnreadNotificationCountsByTier(user.steamid),
  ]);
  await markAllNotificationsRead(user.steamid, activeTier);
  const { t } = await getT();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t("me.notifications.title")}</h1>
      </header>

      {visibleTiers.length > 1 && (
        <nav
          aria-label="Notification tiers"
          className="flex flex-wrap gap-1 border-b border-border text-sm"
        >
          {visibleTiers.map((t) => {
            const tone = TIER_TAB_TONE[t];
            const isActive = activeTier === t;
            const href =
              t === "user" ? "/me/notifications" : `/me/notifications?tier=${t}`;
            const unread = unreadByTier[t] ?? 0;
            return (
              <Link
                key={t}
                href={href}
                className={`flex items-center gap-2 border-b-2 px-3 py-2 transition ${
                  isActive ? tone.active : tone.idle
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {TIER_LABEL[t]}
                {unread > 0 && (
                  <span className="rounded-full bg-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
          {emptyCopyFor(activeTier)}
        </div>
      ) : (
        <ul className="divide-y divide-foreground/5 rounded-xl border border-border bg-card/40">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-accent/5" : ""}`}
            >
              <span className="mt-0.5 text-lg leading-none shrink-0">
                {TYPE_ICONS[n.type] ?? "🔔"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground/90">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-foreground/60">{n.body}</p>}
                <p className="mt-1 text-xs text-foreground/30">
                  {n.createdAt.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {n.link && (
                <Link
                  href={`/api/notifications/${n.id}/click`}
                  className="shrink-0 text-xs text-accent hover:underline"
                  prefetch={false}
                >
                  View →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/me/submissions" className="text-foreground/50 hover:text-foreground">
          ← My submissions
        </Link>
      </div>
    </div>
  );
}

function emptyCopyFor(tier: NotificationTier): string {
  switch (tier) {
    case "user":
      return "No personal notifications yet. Submit a creation or idea to get things flowing.";
    case "moderator":
      return "No moderator alerts right now. You'll see reports and flagged submissions here.";
    case "elite_moderator":
      return "No elite alerts right now. Archives, mutes, and similar escalations show up here.";
    case "creator":
      return "No creator alerts right now. New ideas and site-wide escalations show up here.";
  }
}
