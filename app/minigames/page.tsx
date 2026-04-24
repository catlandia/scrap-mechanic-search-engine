import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minigames & Others — Scrap Mechanic Search Engine",
  description:
    "Small Scrap Mechanic-themed games and other site oddities. Scrapcha, Blockdle, and a live counter for how long the Steam news feed has been quiet.",
  alternates: { canonical: "/minigames" },
};

export default async function MinigamesLandingPage() {
  const { t } = await getT();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">
          {t("minigames.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("minigames.title")}</h1>
        <p className="text-sm text-foreground/60">{t("minigames.subtitle")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
          {t("minigames.gamesHeading")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link
              href="/minigames/scrapcha"
              className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-5 transition hover:border-accent hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl" aria-hidden>
                  🧩
                </span>
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {t("minigames.playLabel")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-accent">
                {t("minigames.scrapcha.name")}
              </h3>
              <p className="text-sm text-foreground/60">
                {t("minigames.scrapcha.blurb")}
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/minigames/blockdle"
              className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-5 transition hover:border-accent hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl" aria-hidden>
                  🟩
                </span>
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {t("minigames.playLabel")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-accent">
                {t("minigames.blockdle.name")}
              </h3>
              <p className="text-sm text-foreground/60">
                {t("minigames.blockdle.blurb")}
              </p>
            </Link>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
          {t("minigames.othersHeading")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link
              href="/minigames/silence"
              className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-5 transition hover:border-accent hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl" aria-hidden>
                  ⏳
                </span>
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                  {t("minigames.othersLabel")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-accent">
                {t("minigames.silence.name")}
              </h3>
              <p className="text-sm text-foreground/60">
                {t("minigames.silence.blurb")}
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
