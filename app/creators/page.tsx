import type { Metadata } from "next";
import Link from "next/link";
import { getTopCreators } from "@/lib/db/queries";

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
  const pageIndex = Math.min(50, Math.max(0, Number(sp.page ?? "1") - 1));

  const rows = await getTopCreators({
    q,
    limit: PAGE_SIZE + 1,
    offset: pageIndex * PAGE_SIZE,
  });
  const hasNext = rows.length > PAGE_SIZE;
  const displayed = rows.slice(0, PAGE_SIZE);

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
        <h1 className="text-3xl font-bold">Creators</h1>
        <p className="text-sm text-foreground/60">
          Workshop authors ranked by how many of their creations made it onto
          the site. Co-authored items count for everyone credited.
        </p>
      </header>

      <form action="/creators" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          aria-label="Search creators by name"
        />
        {q && (
          <Link
            href="/creators"
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground/60 hover:text-foreground"
          >
            Clear
          </Link>
        )}
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Search
        </button>
      </form>

      {displayed.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-4 py-6 text-sm text-foreground/60">
          {q
            ? `No creators match "${q}".`
            : "No creators yet."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayed.map((c) => (
            <li key={c.steamid}>
              <Link
                href={`/author/${c.steamid}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 transition hover:border-accent hover:bg-card"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent"
                >
                  {(c.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {c.name ?? "(unknown)"}
                  </div>
                  <div className="text-xs text-foreground/50">
                    {c.count} {c.count === 1 ? "creation" : "creations"}
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
            ← Prev
          </Link>
        ) : (
          <span />
        )}
        <span>Page {pageIndex + 1}</span>
        {hasNext ? (
          <Link
            href={pageHref(pageIndex + 2)}
            className="rounded border border-border px-3 py-1 hover:text-foreground"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
