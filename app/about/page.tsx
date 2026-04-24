import type { Metadata } from "next";
import Link from "next/link";
import { KIND_THRESHOLDS } from "@/lib/ingest/thresholds";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("about.metadataTitle"),
    description: t("about.metadataDescription"),
    alternates: { canonical: "/about" },
  };
}

const KIND_KEY: Record<string, string> = {
  blueprint: "kind.blueprint",
  mod: "kind.mod",
  world: "kind.world",
  challenge: "kind.challenge",
  tile: "kind.tile",
  custom_game: "kind.customGame",
  terrain_asset: "kind.terrainAsset",
  other: "kind.other",
};

export default async function AboutPage() {
  const { t } = await getT();
  const thresholdRows = Object.entries(KIND_THRESHOLDS).map(([kind, th]) => ({
    kind,
    label: KIND_KEY[kind] ? t(KIND_KEY[kind]) : kind,
    minSubs: th.minSubscriptions,
    minAgeDays: th.minAgeDays,
  }));

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          {t("about.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("about.heading")}</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.shortVersion")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.shortVersionBody")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.step1Heading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.step1Body")}
        </p>

        <h3 className="pt-2 text-sm font-semibold text-foreground/90">
          {t("about.step1TableHeading")}
        </h3>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/80 text-left text-xs uppercase tracking-wider text-foreground/50">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("about.step1TableKind")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("about.step1TableMinSubs")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("about.step1TableMinAge")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {thresholdRows.map((r) => (
                <tr key={r.kind}>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.minSubs.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t("about.thresholdsDays", { n: r.minAgeDays })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.step2Heading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.step2Body")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.step3Heading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.step3BodyBefore")}{" "}
          <Link href="/submit" className="text-accent hover:underline">
            {t("about.step3Submit")}
          </Link>
          {t("about.step3BodyAfter")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.whatIfHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.whatIfBody")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("about.costHeading")}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          {t("about.costBody")}
        </p>
      </section>
    </article>
  );
}
