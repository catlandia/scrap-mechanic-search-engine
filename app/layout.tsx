import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";
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
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // If SESSION_SECRET is missing in dev we still want the site to render.
  }

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-accent hover:text-accent-strong"
            >
              SM<span className="text-foreground">/</span>Search
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Link
                  href="/auth/steam/login"
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-strong"
                >
                  Sign in with Steam
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-white/40">
          Not affiliated with Axolot Games. Data pulled from the Steam Web API. Sign-in
          uses Steam OpenID — we only ever see your public SteamID, never your password.
        </footer>
      </body>
    </html>
  );
}
