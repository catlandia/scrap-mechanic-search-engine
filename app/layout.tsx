import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";
import { RatingModeToggle } from "@/components/RatingModeToggle";
import { getUnreadNotificationCount } from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Scrap Mechanic Search Engine",
    template: "%s · Scrap Mechanic Search Engine",
  },
  description:
    "A curated search engine for Scrap Mechanic Steam Workshop creations, mods, worlds, challenges, and more.",
};

const navLinks = [
  { href: "/new", label: "Newest" },
  { href: "/blueprints", label: "Blueprints" },
  { href: "/mods", label: "Mods" },
  { href: "/worlds", label: "Worlds" },
  { href: "/challenges", label: "Challenges" },
  { href: "/tiles", label: "Tiles" },
  { href: "/search", label: "Search" },
  { href: "/suggestions", label: "Ideas" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  let unreadNotifications = 0;
  try {
    user = await getCurrentUser();
    if (user) unreadNotifications = await getUnreadNotificationCount(user.steamid);
  } catch {
    // If SESSION_SECRET is missing in dev we still want the site to render.
  }
  const ratingMode = await getRatingMode();
  const showAdminLink = !!user && isModerator(user.role as UserRole);
  const extraLinks = [
    { href: "/submit", label: "Submit a creation" },
    ...(user ? [{ href: "/me/favourites", label: "Your favourites" }] : []),
    ...(user ? [{ href: "/me/notifications", label: "Notifications" }] : []),
    ...(user ? [{ href: "/me/submissions", label: "Your submissions" }] : []),
    ...(showAdminLink ? [{ href: "/admin/triage", label: "Admin triage" }] : []),
  ];

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80">
              <img src="/logo.png" alt="Scrap Mechanic" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-tight text-accent">
                <span className="text-foreground">/</span>Search
              </span>
            </Link>
            <nav className="hidden flex-wrap gap-x-5 gap-y-1 text-sm text-white/70 sm:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block">
                <Suspense>
                  <RatingModeToggle current={ratingMode} />
                </Suspense>
              </div>
              {user ? (
                <UserMenu user={user} unreadNotifications={unreadNotifications} />
              ) : (
                <Link
                  href="/auth/steam/login"
                  className="hidden rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong sm:inline-block"
                >
                  Sign in with Steam
                </Link>
              )}
              <MobileNav
                navLinks={navLinks}
                extraLinks={extraLinks}
                ratingMode={ratingMode}
                signedIn={!!user}
              />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-white/40">
          Not affiliated with Axolot Games. Data pulled from the Steam Web API. Sign-in
          uses Steam OpenID — we only ever see your public SteamID, never your password.
        </footer>
      </body>
    </html>
  );
}
