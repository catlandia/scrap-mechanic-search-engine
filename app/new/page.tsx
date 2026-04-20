import type { Metadata } from "next";
import Link from "next/link";
import { CreationGrid } from "@/components/CreationCard";
import { getNewestApproved, parsePageIndex } from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newest additions — Scrap Mechanic Search Engine",
  description:
    "The most recently approved Scrap Mechanic Steam Workshop creations across every kind — fresh blueprints, mods, worlds, challenges, tiles, and more.",
  alternates: { canonical: "/new" },
};

const PAGE_SIZE = 24;

type SearchParams = Promise<{ page?: string }>;

export default async function NewestPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pageIndex = parsePageIndex(params.page);
  const items = await getNewestApproved(PAGE_SIZE + 1, pageIndex * PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);
  const ratingMode = await getRatingMode();
  const { t } = await getT();

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("newest.title")}</h1>
          <p className="text-sm text-foreground/60">{t("newest.subtitle")}</p>
        </div>
      </header>

      <CreationGrid items={displayed} ratingMode={ratingMode} />

      <nav className="flex items-center justify-between pt-4 text-sm text-foreground/60">
        {pageIndex > 0 ? (
          <Link
            href={`/new?page=${pageIndex}`}
            className="rounded border border-border px-3 py-1 hover:text-foreground"
          >
            {t("common.newer")}
          </Link>
        ) : (
          <span />
        )}
        <span>{t("common.page", { n: pageIndex + 1 })}</span>
        {hasNext ? (
          <Link
            href={`/new?page=${pageIndex + 2}`}
            className="rounded border border-border px-3 py-1 hover:text-foreground"
          >
            {t("common.older")}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
