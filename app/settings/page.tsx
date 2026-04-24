import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FunModeToggle } from "@/components/FunModeToggle";
import { FunModeExtremeToggle } from "@/components/FunModeExtremeToggle";
import { RatingModeToggle } from "@/components/RatingModeToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { THEME_LABELS } from "@/lib/prefs";
import {
  getFunMode,
  getFunModeExtreme,
  getLocale,
  getRatingMode,
  getTheme,
} from "@/lib/prefs.server";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your site preferences: theme, ratings, notifications.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings" },
};

export default async function SettingsPage() {
  const [ratingMode, theme, locale, funMode, funModeExtreme, viewer] =
    await Promise.all([
      getRatingMode(),
      getTheme(),
      getLocale(),
      getFunMode(),
      getFunModeExtreme(),
      getCurrentUser(),
    ]);
  const { t } = await getT();

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">{t("settings.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("settings.heading")}</h1>
        <p className="text-sm text-foreground/60">{t("settings.intro")}</p>
      </header>

      <SettingsSection
        title={t("settings.language")}
        description={t("settings.languageHint")}
      >
        <div className="space-y-3">
          <Suspense>
            <LocaleToggle current={locale} />
          </Suspense>
          <p className="text-xs text-foreground/60">{t("settings.tagsDisclaimer")}</p>
        </div>
      </SettingsSection>

      <SettingsSection title={t("settings.theme")} description={t("settings.themeHint")}>
        <div className="space-y-3">
          <Suspense>
            <ThemeToggle current={theme} />
          </Suspense>
          <p className="text-xs text-foreground/60">
            {t("settings.themeCurrently", { name: THEME_LABELS[theme] })}{" "}
            <Link
              href="/settings/theme"
              className="text-accent hover:underline"
            >
              {t("settings.customizeTheme")}
            </Link>
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.ratings")}
        description={t("settings.ratingsHint")}
      >
        <Suspense>
          <RatingModeToggle current={ratingMode} alwaysShow />
        </Suspense>
      </SettingsSection>

      <SettingsSection
        title="Fun Mode"
        description="Opt in to the bits of the site that exist purely for fun — deploy-banner SFX, mod pranks from /admin/abuse like the fake reboot. Real deploy warnings still show with Fun Mode off (you still need to save your work before the site restarts), they just do it silently and without the pranks."
      >
        <div className="space-y-4">
          <Suspense>
            <FunModeToggle current={funMode} />
          </Suspense>
          <div className="space-y-2 border-t border-border/60 pt-4">
            <p className="text-xs text-foreground/60">
              <span className="font-semibold text-foreground/80">
                EXTREME FUN MODE.
              </span>{" "}
              Layered on top of Fun Mode. For now it&apos;s a blank button —
              no effects are wired up yet. Once the Creator adds behaviour
              this is where random click events and other ambient weirdness
              will live. Turning Fun Mode off cascades this back to off.
            </p>
            <Suspense>
              <FunModeExtremeToggle
                current={funModeExtreme}
                funModeOn={funMode}
              />
            </Suspense>
          </div>
        </div>
      </SettingsSection>

      {viewer && (
        <SettingsSection
          title={t("settings.account")}
          description={t("settings.accountHint")}
        >
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/profile/${viewer.steamid}`}
                className="text-accent hover:underline"
              >
                {t("settings.profileLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/me/favourites"
                className="text-accent hover:underline"
              >
                {t("settings.favouritesLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/me/submissions"
                className="text-accent hover:underline"
              >
                {t("settings.submissionsLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/me/notifications"
                className="text-accent hover:underline"
              >
                {t("settings.notificationsLink")}
              </Link>
            </li>
            {isModerator(viewer.role as UserRole) && (
              <li>
                <Link
                  href="/admin/triage"
                  className="text-accent hover:underline"
                >
                  Admin triage →
                </Link>
              </li>
            )}
            <li>
              <form action="/auth/logout" method="post" className="inline">
                <button
                  type="submit"
                  className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("common.signOut")}
                </button>
              </form>
            </li>
          </ul>
        </SettingsSection>
      )}

      <SettingsSection
        title={t("settings.helpInfo")}
        description={t("settings.helpHint")}
      >
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/guide" className="text-accent hover:underline">
              {t("settings.quickGuide")}
            </Link>
          </li>
          <li>
            <Link
              href="/suggestions"
              className="text-accent hover:underline"
            >
              {t("settings.ideasBoardLink")}
            </Link>
          </li>
          <li>
            <Link href="/support" className="text-accent hover:underline">
              {t("settings.supportLink")}
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-accent hover:underline">
              {t("settings.terms")}
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              {t("settings.privacy")}
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
