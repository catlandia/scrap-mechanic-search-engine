import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("privacy.metadataTitle"),
    description: t("privacy.metadataDescription"),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-foreground/80">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {t("privacy.h1")}
        </h1>
        <p className="text-foreground/50">{t("privacy.lastUpdated")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Short")}
        </h2>
        <p>{t("privacy.pShort")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Store")}
        </h2>
        <p>{t("privacy.pStoreIntro")}</p>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li>{t("privacy.liStoreId")}</li>
          <li>{t("privacy.liStoreAge")}</li>
          <li>{t("privacy.liStoreActivity")}</li>
        </ul>
        <p dangerouslySetInnerHTML={{ __html: t("privacy.pStoreNot") }} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Cookies")}
        </h2>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li dangerouslySetInnerHTML={{ __html: t("privacy.liCookieSession") }} />
          <li dangerouslySetInnerHTML={{ __html: t("privacy.liCookieCaptcha") }} />
          <li dangerouslySetInnerHTML={{ __html: t("privacy.liCookieBotVerified") }} />
          <li dangerouslySetInnerHTML={{ __html: t("privacy.liCookieRatingMode") }} />
          <li dangerouslySetInnerHTML={{ __html: t("privacy.liCookieTheme") }} />
        </ul>
        <p>{t("privacy.pCookieFooter")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Where")}
        </h2>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li>{t("privacy.liWhereDb")}</li>
          <li>{t("privacy.liWhereHost")}</li>
          <li>{t("privacy.liWhereSteam")}</li>
        </ul>
        <p>{t("privacy.pWhereLogs")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Controls")}
        </h2>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li>{t("privacy.liControlsStop")}</li>
          <li>
            {t("privacy.liControlsDeletePre")}
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {t("privacy.liControlsDeleteLink")}
            </a>
            {t("privacy.liControlsDeletePost")}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("privacy.h2Changes")}
        </h2>
        <p>{t("privacy.pChanges")}</p>
      </section>
    </article>
  );
}
