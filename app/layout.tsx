import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";
import { NavDropdown } from "@/components/NavDropdown";
import { BetaBanner } from "@/components/BetaBanner";
import { DeployBanner } from "@/components/DeployBanner";
import { GuideLink } from "@/components/GuideLink";
import { ToastProvider } from "@/components/Toast";
import { getUnreadChangelogCount } from "@/lib/changelog/actions";
import { getUnreadNotificationCountsByTier, getUserCounts } from "@/lib/db/queries";
import type { NotificationTier } from "@/lib/db/schema";
import { getCustomThemeColors, getRatingMode, getTheme } from "@/lib/prefs.server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import { Analytics } from "@vercel/analytics/next";
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

type NavItem =
  | { kind: "link"; href: string; label: string; badge?: number }
  | { kind: "group"; label: string; items: { href: string; label: string }[] };

// Kind pages live under a single "Browse" dropdown on desktop (and a section
// header on mobile) so the top bar stops at 6 items instead of 12.
const browseHrefs = [
  { href: "/blueprints", key: "kind.blueprints" as const },
  { href: "/mods", key: "kind.mods" as const },
  { href: "/worlds", key: "kind.worlds" as const },
  { href: "/challenges", key: "kind.challenges" as const },
  { href: "/tiles", key: "kind.tiles" as const },
  { href: "/custom-games", key: "kind.customGames" as const },
  { href: "/terrain", key: "kind.terrain" as const },
  { href: "/other", key: "kind.other" as const },
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
  const { locale, t } = await getT();
  const dict = getDictionary(locale);
  const browseItems = browseHrefs.map((b) => ({ href: b.href, label: t(b.key) }));
  const navItems: NavItem[] = [
    { kind: "link", href: "/new", label: t("nav.newest") },
    { kind: "group", label: t("nav.browse"), items: browseItems },
    { kind: "link", href: "/search", label: t("nav.search") },
    { kind: "link", href: "/creators", label: t("nav.creators") },
    { kind: "link", href: "/suggestions", label: t("nav.ideas") },
    { kind: "link", href: "/minigames", label: t("nav.minigames") },
    { kind: "link", href: "/changelog", label: t("nav.whatsNew") },
    { kind: "link", href: "/submit", label: t("nav.submit") },
  ];
  // Unread changelog entries drive the "What's new" top-bar badge. Bounded
  // to 99 server-side so the pill stays compact.
  let unreadChangelog = 0;
  try {
    unreadChangelog = await getUnreadChangelogCount();
  } catch {
    // Changelog is cosmetic — never block the layout render.
  }
  const navItemsWithBadges: NavItem[] = navItems.map((item) => {
    if (item.kind === "link" && item.href === "/changelog") {
      return { ...item, badge: unreadChangelog };
    }
    return item;
  });
  let userCounts: { total: number; online: number } | null = null;
  try {
    userCounts = await getUserCounts();
  } catch {
    // Presence counters are cosmetic — never block the layout render.
  }
  const customColors = theme === "custom" ? await getCustomThemeColors() : null;
  const showAdminLink = !!user && isModerator(user.role as UserRole);
  const extraLinks = [
    { href: "/about", label: "About the site" },
    { href: "/guide", label: "How to use the site" },
    { href: "/support", label: "Support the site" },
    { href: "/settings", label: "Settings" },
    ...(user ? [{ href: "/me/favourites", label: "Your favourites" }] : []),
    ...(user ? [{ href: "/me/notifications", label: "Notifications" }] : []),
    ...(user ? [{ href: "/me/submissions", label: "Your submissions" }] : []),
    ...(showAdminLink ? [{ href: "/admin/triage", label: "Admin triage" }] : []),
  ];

  return (
    <html lang={locale} className="dark" data-theme={theme}>
      <head>
        <meta name="msvalidate.01" content="C7BE56E66887614C5291BC85D654FB41" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Scrap Mechanic Search — Newest"
          href="/feed.xml"
        />
        {/* Resolve `data-theme="auto"` to a concrete theme BEFORE first paint
            based on the OS's prefers-color-scheme. The original "auto" value
            is stashed on `data-theme-source` so we can (a) stay subscribed
            to OS-level changes and flip live, and (b) keep the Auto pill
            highlighted in the picker. Synchronous inline <script> runs before
            stylesheets apply, so no flash of the wrong palette. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=document.documentElement;if(h.getAttribute("data-theme")!=="auto")return;h.setAttribute("data-theme-source","auto");var mq=window.matchMedia("(prefers-color-scheme: dark)");var apply=function(){h.setAttribute("data-theme",mq.matches?"v1":"default")};apply();if(mq.addEventListener){mq.addEventListener("change",apply)}else if(mq.addListener){mq.addListener(apply)}}catch(e){}})();`,
          }}
        />
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
        <LocaleProvider locale={locale} dict={dict}>
        <ToastProvider>
        <DeployBanner />
        <BetaBanner />
        <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-x-6">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80">
              <img src="/logo.png" alt="Scrap Mechanic" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-tight text-accent">
                <span className="text-foreground">/</span>Search
              </span>
            </Link>
            <nav className="hidden min-w-0 flex-nowrap items-center gap-x-5 text-sm text-foreground/70 lg:flex">
              {navItemsWithBadges.map((item) =>
                item.kind === "group" ? (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                    items={item.items}
                  />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    {item.label}
                    {item.badge && item.badge > 0 ? (
                      <span
                        aria-label={`${item.badge} unread`}
                        className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black"
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ),
              )}
              {showAdminLink && (
                <Link
                  href="/admin/triage"
                  className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-300 hover:border-sky-300 hover:bg-sky-500/20 hover:text-sky-200"
                  title="Jump to the admin triage queue"
                >
                  Admin
                </Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <GuideLink />
              {/* Settings gear always visible (signed-in or not) so the
                  language picker + other preferences don't require a Steam
                  login. Hardcoded zinc so it stays visible under a custom
                  theme that collapses foreground/background tokens. */}
              <Link
                href="/settings"
                className="inline-flex size-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                title="Settings"
                aria-label="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 0 1-2.28.95c-1.37-.84-2.94.73-2.1 2.1.47.77.02 1.79-.95 2.28-1.56.38-1.56 2.6 0 2.98.97.49 1.42 1.51.95 2.28-.84 1.37.73 2.94 2.1 2.1.77-.47 1.79-.02 2.28.95.38 1.56 2.6 1.56 2.98 0 .49-.97 1.51-1.42 2.28-.95 1.37.84 2.94-.73 2.1-2.1-.47-.77-.02-1.79.95-2.28 1.56-.38 1.56-2.6 0-2.98-.97-.49-1.42-1.51-.95-2.28.84-1.37-.73-2.94-2.1-2.1-.77.47-1.79.02-2.28-.95zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              {user ? (
                <UserMenu user={user} unreadByTier={unreadByTier} />
              ) : (
                // Plain <a>: /auth/steam/login server-redirects to steamcommunity.com,
                // and <Link>'s RSC prefetch of that URL trips CORS.
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a
                  href="/auth/steam/login"
                  className="hidden rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong sm:inline-block"
                >
                  {t("nav.signIn")}
                </a>
              )}
              <MobileNav
                navItems={navItemsWithBadges}
                extraLinks={extraLinks}
                ratingMode={ratingMode}
                theme={theme}
                signedIn={!!user}
              />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-10 text-xs text-foreground/50">
          {userCounts && (
            <p
              className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1"
              aria-label="Site presence"
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-full bg-emerald-500"
                />
                {t("footer.online", { online: userCounts.online.toLocaleString() })}
              </span>
              <span className="text-foreground/30">·</span>
              <span>
                {t("footer.signedInTotal", { total: userCounts.total.toLocaleString() })}
              </span>
            </p>
          )}
          <p>
            Not affiliated with Axolot Games. Data pulled from the Steam Web API. Sign-in
            uses Steam OpenID — we only ever see your public SteamID, never your password.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>Made by CybeSlime2077.</span>
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/guide" className="hover:text-foreground">
              Guide
            </Link>
            <Link href="/support" className="hover:text-foreground">
              Support
            </Link>
            <Link href="/settings" className="hover:text-foreground">
              Settings
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
            <a
              href="https://steamcommunity.com/groups/scrapmechanicsearchengine"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Steam Group
            </a>
            <Link href="/feed.xml" className="hover:text-foreground">
              RSS
            </Link>
          </p>
        </footer>
        </ToastProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
