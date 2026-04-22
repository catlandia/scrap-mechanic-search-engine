import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minigames — Scrap Mechanic Search Engine",
  description:
    "Small Scrap Mechanic-themed games built into the site. Start with Scrapcha, the character-identification puzzle.",
  alternates: { canonical: "/minigames" },
};

export default async function MinigamesLandingPage() {
  const { t } = await getT();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">
          {t("minigames.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("minigames.title")}</h1>
        <p className="text-sm text-foreground/60">{t("minigames.subtitle")}</p>
      </header>

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
            <h2 className="text-lg font-semibold text-foreground group-hover:text-accent">
              {t("minigames.scrapcha.name")}
            </h2>
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
            <h2 className="text-lg font-semibold text-foreground group-hover:text-accent">
              {t("minigames.blockdle.name")}
            </h2>
            <p className="text-sm text-foreground/60">
              {t("minigames.blockdle.blurb")}
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
