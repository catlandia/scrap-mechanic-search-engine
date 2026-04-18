import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserNotifications, markAllNotificationsRead } from "@/lib/db/queries";

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
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/me/notifications");

  const notifications = await getUserNotifications(user.steamid);
  await markAllNotificationsRead(user.steamid);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">Your activity</p>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-sm text-white/60">Updates on your submissions, suggestions, and ideas.</p>
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-white/60">
          No notifications yet. Submit a creation or idea to get started.
        </div>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-border bg-card/40">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-accent/5" : ""}`}
            >
              <span className="mt-0.5 text-lg leading-none shrink-0">
                {TYPE_ICONS[n.type] ?? "🔔"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white/90">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-white/60">{n.body}</p>}
                <p className="mt-1 text-xs text-white/30">
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
        <Link href="/me/submissions" className="text-white/50 hover:text-white">
          ← My submissions
        </Link>
      </div>
    </div>
  );
}
