import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";
import { RatingModeToggle } from "@/components/RatingModeToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BetaBanner } from "@/components/BetaBanner";
import { GuideLink } from "@/components/GuideLink";
import { getUnreadNotificationCountsByTier } from "@/lib/db/queries";
import type { NotificationTier } from "@/lib/db/schema";
import { getCustomThemeColors, getRatingMode, getTheme } from "@/lib/prefs.server";
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import "./globals.css";

const siteTitle = "Scrap Mechanic Search Engine";
const siteDescription =
  "A curated search engine for Scrap Mechanic Steam Workshop creations, mods, worlds, challenges, and more.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: siteTitle,
    template: "%s · Scrap Mechanic Search Engine",
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "Scrap Mechanic Search Engine",
    url: "/",
    type: "website",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/logo.png"],
  },
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
  let unreadByTier: Record<NotificationTier, number> = {
    user: 0,
    moderator: 0,
    elite_moderator: 0,
    creator: 0,
  };
  try {
    user = await getCurrentUser();
    if (user) {
      unreadByTier = await getUnreadNotificationCountsByTier(user.steamid);
    }
  } catch {
    // If SESSION_SECRET is missing in dev we still want the site to render.
  }
  const ratingMode = await getRatingMode();
  const theme = await getTheme();
  const customColors = theme === "custom" ? await getCustomThemeColors() : null;
  const showAdminLink = !!user && isModerator(user.role as UserRole);
  const extraLinks = [
    { href: "/guide", label: "How to use the site" },
    { href: "/submit", label: "Submit a creation" },
    ...(user ? [{ href: "/me/favourites", label: "Your favourites" }] : []),
    ...(user ? [{ href: "/me/notifications", label: "Notifications" }] : []),
    ...(user ? [{ href: "/me/submissions", label: "Your submissions" }] : []),
    ...(showAdminLink ? [{ href: "/admin/triage", label: "Admin triage" }] : []),
  ];

  return (
    <html lang="en" className="dark" data-theme={theme}>
      <head>
        {/* When the user has picked a custom theme, inject their colours into
            the `[data-theme="custom"]` selector. Values are hex-only (regex
            validated before the cookie is written) so interpolation is safe. */}
        {theme === "custom" && customColors && (
          <style
            dangerouslySetInnerHTML={{
              __html: `html[data-theme="custom"]{--color-background:${customColors.background};--color-foreground:${customColors.foreground};--color-card:${customColors.card};--color-card-hover:${customColors.card};--color-muted:${customColors.foreground};--color-accent:${customColors.accent};--color-accent-strong:${customColors.accent};--color-border:${customColors.border};}`,
            }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <BetaBanner />
        <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80">
              <img src="/logo.png" alt="Scrap Mechanic" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-tight text-accent">
                <span className="text-foreground">/</span>Search
              </span>
            </Link>
            <nav className="hidden flex-wrap gap-x-5 gap-y-1 text-sm text-foreground/70 sm:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <GuideLink />
              <div className="hidden sm:block">
                <Suspense>
                  <RatingModeToggle current={ratingMode} />
                </Suspense>
              </div>
              <div className="hidden lg:block">
                <Suspense>
                  <ThemeToggle current={theme} />
                </Suspense>
              </div>
              {user ? (
                <UserMenu user={user} unreadByTier={unreadByTier} />
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
                theme={theme}
                signedIn={!!user}
              />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-foreground/50">
          <p>
            Not affiliated with Axolot Games. Data pulled from the Steam Web API. Sign-in
            uses Steam OpenID — we only ever see your public SteamID, never your password.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>Made by CybeSlime2077.</span>
            <Link href="/guide" className="hover:text-foreground">
              Guide
            </Link>
            <Link href="/settings/theme" className="hover:text-foreground">
              Theme
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
