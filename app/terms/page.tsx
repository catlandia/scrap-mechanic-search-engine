import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("terms.metadataTitle"),
    description: t("terms.metadataDescription"),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-foreground/80">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {t("terms.heading")}
        </h1>
        <p className="text-foreground/50">{t("terms.lastUpdated")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2What")}
        </h2>
        <p>{t("terms.pWhat")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Account")}
        </h2>
        <p>
          {t("terms.pAccount1")}
          <Link href="/privacy" className="text-accent hover:underline">
            {t("terms.pAccountLink")}
          </Link>
          {t("terms.pAccount2")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Rules")}
        </h2>
        <p>{t("terms.pRulesIntro")}</p>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li>{t("terms.liRulesDecent")}</li>
          <li>{t("terms.liRulesSpam")}</li>
          <li>{t("terms.liRulesAppid")}</li>
          <li>{t("terms.liRulesPii")}</li>
          <li>{t("terms.liRulesExploit")}</li>
        </ul>
        <p>{t("terms.pRulesMods")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Content")}
        </h2>
        <p>{t("terms.pContent")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Takedowns")}
        </h2>
        <p>
          {t("terms.pTakedowns1")}
          <a
            href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            {t("terms.pTakedownsLink")}
          </a>
          {t("terms.pTakedowns2")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Warranty")}
        </h2>
        <p>{t("terms.pWarranty")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("terms.h2Changes")}
        </h2>
        <p>{t("terms.pChanges")}</p>
      </section>
    </article>
  );
}
