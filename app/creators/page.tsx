import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTopCreators, parsePageIndex } from "@/lib/db/queries";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creators — Scrap Mechanic Search Engine",
  description:
    "Browse Scrap Mechanic Workshop creators by number of creations on the site.",
  alternates: { canonical: "/creators" },
};

const PAGE_SIZE = 60;

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pageIndex = parsePageIndex(sp.page, 50);

  const rows = await getTopCreators({
    q,
    limit: PAGE_SIZE + 1,
    offset: pageIndex * PAGE_SIZE,
  });
  const hasNext = rows.length > PAGE_SIZE;
  const displayed = rows.slice(0, PAGE_SIZE);
  const { t } = await getT();

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const s = params.toString();
    return s ? `/creators?${s}` : "/creators";
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t("creators.title")}</h1>
        <p className="text-sm text-foreground/60">{t("creators.subtitle")}</p>
      </header>

      <form action="/creators" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("creators.searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          aria-label={t("creators.searchAria")}
        />
        {q && (
          <Link
            href="/creators"
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground/60 hover:text-foreground"
          >
            {t("common.clear")}
          </Link>
        )}
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          {t("common.search")}
        </button>
      </form>

      {displayed.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-4 py-6 text-sm text-foreground/60">
          {q ? t("creators.noMatch", { q }) : t("creators.empty")}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayed.map((c) => (
            <li key={c.steamid}>
              <Link
                href={`/profile/${c.steamid}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 transition hover:border-accent hover:bg-card"
                title={c.signedIn ? `${c.name ?? "?"} — on the site` : undefined}
              >
                {c.avatarUrl ? (
                  <Image
                    src={c.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="size-9 shrink-0 rounded-full border border-accent/60"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent"
                  >
                    {(c.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.name ?? t("creators.unknownName")}
                    </span>
                    {c.signedIn && (
                      <span
                        aria-label="Signed in to the site"
                        title="Has a profile on the site"
                        className="shrink-0 text-[10px] leading-none text-accent"
                      >
                        ●
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-foreground/50">
                    {t(c.count === 1 ? "creators.creationCountOne" : "creators.creationCountMany", { count: c.count })}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="flex items-center justify-between pt-2 text-sm text-foreground/60">
        {pageIndex > 0 ? (
          <Link
            href={pageHref(pageIndex)}
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
            href={pageHref(pageIndex + 2)}
            className="rounded border border-border px-3 py-1 hover:text-foreground"
          >
            {t("common.older")}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
