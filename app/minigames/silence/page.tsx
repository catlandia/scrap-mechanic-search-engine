import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLatestScrapMechanicTweet } from "@/lib/social/twitter";
import { SilenceCounter } from "@/components/minigames/SilenceCounter";

export const metadata: Metadata = {
  title: "Time since the last Scrap Mechanic news — Scrap Mechanic Search Engine",
  description:
    "Live counter showing how long it's been since Axolot posted anything to the official @ScrapMechanic account on X.",
  alternates: { canonical: "/minigames/silence" },
  robots: { index: false, follow: true },
};

export default async function SilencePage() {
  const { t } = await getT();
  // The last @ScrapMechanic post is pinned in lib/social/twitter.ts (X has no
  // free API). The counter itself ticks client-side from this date.
  const news = getLatestScrapMechanicTweet();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-sm">
        <Link
          href="/minigames"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("minigames.backToIndex")}
        </Link>
      </div>

      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">
          {t("minigames.othersHeading")}
        </p>
        <h1 className="text-3xl font-bold">{t("minigames.silence.title")}</h1>
        <p className="text-sm text-foreground/60">
          {t("minigames.silence.subtitle")}
        </p>
      </header>

      {news ? (
        <>
          <SilenceCounter sinceUnix={news.date} />

          <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
            <div className="text-[11px] uppercase tracking-wider text-foreground/50">
              {t("minigames.silence.lastNewsLabel")}
            </div>
            <a
              href={news.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-semibold text-accent hover:underline"
            >
              {news.title} ↗
            </a>
            <div className="mt-1 text-xs text-foreground/50">
              {news.feedlabel} · {new Date(news.date * 1000).toUTCString()}
            </div>
          </div>

          <p className="text-xs text-foreground/40">
            {t("minigames.silence.disclaimer")}
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          {t("minigames.silence.error")}
        </div>
      )}
    </div>
  );
}
