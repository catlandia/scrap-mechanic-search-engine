import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RatingModeToggle } from "@/components/RatingModeToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_LABELS } from "@/lib/prefs";
import { getRatingMode, getTheme } from "@/lib/prefs.server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your site preferences: theme, ratings, notifications.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings" },
};

export default async function SettingsPage() {
  const [ratingMode, theme, viewer] = await Promise.all([
    getRatingMode(),
    getTheme(),
    getCurrentUser(),
  ]);

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">Settings</p>
        <h1 className="text-3xl font-bold">Your preferences</h1>
        <p className="text-sm text-foreground/60">
          Every setting here is stored in a browser cookie — no account
          required. If you clear cookies, everything resets to the defaults.
        </p>
      </header>

      <SettingsSection title="Theme" description="How the whole site looks.">
        <div className="space-y-3">
          <Suspense>
            <ThemeToggle current={theme} />
          </Suspense>
          <p className="text-xs text-foreground/60">
            Currently using <strong>{THEME_LABELS[theme]}</strong>. Want your
            own palette?{" "}
            <Link
              href="/settings/theme"
              className="text-accent hover:underline"
            >
              Customize your theme →
            </Link>
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Ratings"
        description="Which rating do you want to see on each creation card — Steam's global vote, the site's own vote, or both?"
      >
        <Suspense>
          <RatingModeToggle current={ratingMode} alwaysShow />
        </Suspense>
      </SettingsSection>

      {viewer && (
        <SettingsSection
          title="Your account"
          description="Stuff linked to your Steam account."
        >
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/profile/${viewer.steamid}`}
                className="text-accent hover:underline"
              >
                Your public profile →
              </Link>
            </li>
            <li>
              <Link
                href="/me/favourites"
                className="text-accent hover:underline"
              >
                Your favourites →
              </Link>
            </li>
            <li>
              <Link
                href="/me/submissions"
                className="text-accent hover:underline"
              >
                Your submissions →
              </Link>
            </li>
            <li>
              <Link
                href="/me/notifications"
                className="text-accent hover:underline"
              >
                Your notifications →
              </Link>
            </li>
            <li>
              <form action="/auth/logout" method="post" className="inline">
                <button
                  type="submit"
                  className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                >
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </SettingsSection>
      )}

      <SettingsSection
        title="Help &amp; info"
        description="Need a refresher on how the site works?"
      >
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/guide" className="text-accent hover:underline">
              Quick guide →
            </Link>
          </li>
          <li>
            <Link
              href="/suggestions"
              className="text-accent hover:underline"
            >
              Ideas board →
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-accent hover:underline">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy
            </Link>{" "}
            ·{" "}
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              GitHub
            </a>
          </li>
        </ul>
      </SettingsSection>
    </article>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-foreground/60">{description}</p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}
