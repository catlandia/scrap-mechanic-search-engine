import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("support.metadataTitle"),
    description: t("support.metadataDescription"),
    alternates: { canonical: "/support" },
  };
}

export default async function SupportPage() {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          {t("support.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("support.heading")}</h1>
        <p className="text-sm text-foreground/70">{t("support.intro")}</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.spreadHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.spreadP1")}
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.spreadP2Before")}{" "}
          <strong>{t("support.spreadP2ShareLabel")}</strong>{" "}
          {t("support.spreadP2Between")}{" "}
          <em>{t("support.spreadP2ViewLabel")}</em>{" "}
          {t("support.spreadP2After")}
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.spreadP3Before")}{" "}
          <a
            href="https://steamcommunity.com/groups/scrapmechanicsearchengine"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            {t("support.spreadP3SteamGroup")}
          </a>
          {" "}
          {t("support.spreadP3After")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.submitHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.submitP1Before")}{" "}
          <Link href="/submit" className="text-accent hover:underline">
            {t("support.submitP1Link")}
          </Link>
          {t("support.submitP1After")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.voteHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.voteP1")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.reportHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.reportP1Before")}{" "}
          <strong>{t("support.reportP1Label")}</strong>{" "}
          {t("support.reportP1After")}
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.reportP2")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.suggestHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.suggestP1Before")}{" "}
          <Link href="/suggestions" className="text-accent hover:underline">
            {t("support.suggestP1Link")}
          </Link>{" "}
          {t("support.suggestP1After")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.bugsHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.bugsP1Before")}{" "}
          <a
            href="https://github.com/catlandia/scrap-mechanic-search-engine"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            {t("support.bugsP1GitHub")}
          </a>
          {t("support.bugsP1After")}{" "}
          <strong>{t("support.bugsP1BadgeLabel")}</strong>{" "}
          {t("support.bugsP1BadgeAfter")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">{t("support.moneyHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.moneyP1")}
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("support.moneyP2")}
        </p>
      </section>
    </article>
  );
}
