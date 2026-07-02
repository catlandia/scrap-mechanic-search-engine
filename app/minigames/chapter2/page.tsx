import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { CHAPTER2 } from "@/lib/chapter2";
import { Chapter2Countdown } from "@/components/minigames/Chapter2Countdown";

const STEAM_STORE_URL =
  "https://store.steampowered.com/app/387990/Scrap_Mechanic/";

export const metadata: Metadata = {
  title: "Chapter 2 countdown — Scrap Mechanic Search Engine",
  description:
    "A live countdown to the release of Scrap Mechanic's next chapter. The moment Axolot announces a date, the timer starts ticking.",
  alternates: { canonical: "/minigames/chapter2" },
  robots: { index: false, follow: true },
};

export default async function Chapter2Page() {
  const { t } = await getT();
  const release = CHAPTER2;

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
        <h1 className="text-3xl font-bold">{t("minigames.chapter2.title")}</h1>
        <p className="text-sm text-foreground/60">
          {t("minigames.chapter2.subtitle")}
        </p>
      </header>

      <Chapter2Countdown
        releaseUnix={release.releaseUnix}
        storeUrl={STEAM_STORE_URL}
      />

      {release.releaseUnix === null ? (
        <div className="rounded-lg border border-border bg-card/40 p-4 text-center text-sm">
          <div className="font-semibold">
            {t("minigames.chapter2.notAnnouncedTitle")}
          </div>
          <p className="mt-1 text-foreground/60">
            {t("minigames.chapter2.notAnnouncedBody")}
          </p>
          <Link
            href="/minigames/silence"
            className="mt-3 inline-block font-semibold text-accent hover:underline"
          >
            {t("minigames.chapter2.notAnnouncedCta")} →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
          <div className="text-[11px] uppercase tracking-wider text-foreground/50">
            {t("minigames.chapter2.releaseDateLabel")}
          </div>
          <div className="mt-1 font-semibold">
            {new Date(release.releaseUnix * 1000).toUTCString()}
          </div>
          <a
            href={release.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs text-accent hover:underline"
          >
            {release.sourceLabel} ↗
          </a>
        </div>
      )}

      <p className="text-xs text-foreground/40">
        {t("minigames.chapter2.disclaimer")}
      </p>
    </div>
  );
}
