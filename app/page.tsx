import type { Metadata } from "next";
import Link from "next/link";
import { CreationGrid } from "@/components/CreationCard";
import {
  getApprovedByKind,
  getApprovedKindCounts,
  getForYouFeed,
  getNewestApproved,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { getT } from "@/lib/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scrap Mechanic Search Engine",
  description:
    "Browse a curated directory of Scrap Mechanic Steam Workshop creations — blueprints, mods, worlds, challenges, tiles, custom games, and terrain assets.",
  alternates: { canonical: "/" },
};

const FEATURED_KINDS: Array<{
  kind: "blueprint" | "mod" | "world" | "challenge" | "tile";
  href: string;
  labelKey: string;
}> = [
  { kind: "blueprint", href: "/blueprints", labelKey: "home.popularBlueprints" },
  { kind: "mod", href: "/mods", labelKey: "home.popularMods" },
  { kind: "world", href: "/worlds", labelKey: "home.popularWorlds" },
  { kind: "challenge", href: "/challenges", labelKey: "home.popularChallenges" },
];

export default async function HomePage() {
  const viewer = await getCurrentUser();
  let newest: Awaited<ReturnType<typeof getNewestApproved>> = [];
  let counts: Record<string, number> = {};
  let perKind: Awaited<ReturnType<typeof getApprovedByKind>>[] = [];
  let forYou: Awaited<ReturnType<typeof getForYouFeed>> = [];
  let dbError: string | null = null;

  try {
    const results = await Promise.all([
      getNewestApproved(12),
      getApprovedKindCounts(),
      getForYouFeed(viewer?.steamid ?? null, 6),
      ...FEATURED_KINDS.map((k) =>
        getApprovedByKind(k.kind, { sort: "popular", limit: 6 }),
      ),
    ]);
    newest = results[0] as typeof newest;
    counts = results[1] as typeof counts;
    forYou = results[2] as typeof forYou;
    perKind = results.slice(3) as typeof perKind;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const hasAny = total > 0;
  const ratingMode = await getRatingMode();
  const { t } = await getT();

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scrap-mechanic-search-engine.vercel.app";
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Scrap Mechanic Search Engine",
    url: siteBase,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteBase}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="space-y-14">
      <JsonLd data={websiteJsonLd} />
      <section className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-4 text-sm leading-relaxed text-foreground/80 sm:px-6">
        <p>
          {t("home.supportCalloutBefore")}{" "}
          <Link
            href="/support"
            className="font-semibold text-accent hover:underline"
          >
            {t("home.supportCalloutLink")}
          </Link>{" "}
          {t("home.supportCalloutAfter")}
        </p>
      </section>
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-widest text-accent">
          Scrap Mechanic · Search Engine
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="max-w-2xl text-lg text-foreground/70">
          {t("home.descriptionBefore")}{" "}
          <Link href="/search?tags=house,car" className="text-accent hover:underline">
            {t("home.descriptionExample1")}
          </Link>{" "}
          {t("home.descriptionBetween")}{" "}
          <Link href="/search?tags=walker,mech" className="text-accent hover:underline">
            {t("home.descriptionExample2")}
          </Link>{" "}
          {t("home.descriptionAfter")}
        </p>
        {hasAny && (
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm">
            <span aria-hidden>📚</span>
            <span className="text-foreground/70">
              {total === 1
                ? t("home.indexedOne", { count: total.toLocaleString() })
                : t("home.indexedMany", { count: total.toLocaleString() })}
            </span>
          </div>
        )}
      </section>

      {dbError ? (
        <section className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
          <div className="font-medium text-amber-200">Database not reachable.</div>
          <div className="font-mono text-xs text-amber-100/80">{dbError}</div>
          <div className="text-foreground/60">
            Check that <code className="rounded bg-black/40 px-1">DATABASE_URL</code> is set in
            Vercel and migrations have been applied (
            <code className="rounded bg-black/40 px-1">npm run db:migrate</code>).
          </div>
        </section>
      ) : !hasAny ? (
        <section className="rounded-md border border-border bg-card/60 px-5 py-8 text-sm text-foreground/60">
          {t("home.emptyState")}
        </section>
      ) : (
        <>
          {forYou.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">
                  {viewer
                    ? t("home.forYouHeading")
                    : t("home.trendingHeading")}
                </h2>
                <span className="text-xs text-foreground/50">
                  {viewer
                    ? t("home.forYouHint")
                    : t("home.trendingHint")}
                </span>
              </div>
              <CreationGrid items={forYou} ratingMode={ratingMode} />
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">{t("home.newestHeading")}</h2>
              <Link href="/new" className="text-sm text-accent hover:underline">
                {t("home.viewAll")}
              </Link>
            </div>
            <CreationGrid items={newest} ratingMode={ratingMode} />
          </section>

          {FEATURED_KINDS.map((kind, i) => {
            const items = perKind[i] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={kind.kind} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">{t(kind.labelKey)}</h2>
                  <Link href={kind.href} className="text-sm text-accent hover:underline">
                    {t("common.more")}
                  </Link>
                </div>
                <CreationGrid items={items} ratingMode={ratingMode} />
              </section>
            );
          })}

        </>
      )}
    </div>
  );
}
