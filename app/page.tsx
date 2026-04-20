import type { Metadata } from "next";
import Link from "next/link";
import { CreationGrid } from "@/components/CreationCard";
import {
  getApprovedByKind,
  getApprovedKindCounts,
  getNewestApproved,
} from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { getT } from "@/lib/i18n/server";

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
  label: string;
}> = [
  { kind: "blueprint", href: "/blueprints", label: "Popular Blueprints" },
  { kind: "mod", href: "/mods", label: "Popular Mods" },
  { kind: "world", href: "/worlds", label: "Popular Worlds" },
  { kind: "challenge", href: "/challenges", label: "Popular Challenges" },
];

export default async function HomePage() {
  let newest: Awaited<ReturnType<typeof getNewestApproved>> = [];
  let counts: Record<string, number> = {};
  let perKind: Awaited<ReturnType<typeof getApprovedByKind>>[] = [];
  let dbError: string | null = null;

  try {
    const results = await Promise.all([
      getNewestApproved(12),
      getApprovedKindCounts(),
      ...FEATURED_KINDS.map((k) =>
        getApprovedByKind(k.kind, { sort: "popular", limit: 6 }),
      ),
    ]);
    newest = results[0] as typeof newest;
    counts = results[1] as typeof counts;
    perKind = results.slice(2) as typeof perKind;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const hasAny = total > 0;
  const ratingMode = await getRatingMode();
  const { t } = await getT();

  return (
    <div className="space-y-14">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-widest text-accent">
          Scrap Mechanic · Search Engine
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="max-w-2xl text-lg text-foreground/70">
          Hand-curated Blueprints, Mods, Worlds, and more. Combine tags like{" "}
          <Link href="/search?tags=house,car" className="text-accent hover:underline">
            house + car
          </Link>{" "}
          to find a drivable camper — or{" "}
          <Link href="/search?tags=walker,mech" className="text-accent hover:underline">
            walker + mech
          </Link>{" "}
          for a hexapod. Low-effort creations are filtered out.
        </p>
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
          No approved creations yet. Kick off an ingest and review the queue.
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Newest additions</h2>
              <Link href="/new" className="text-sm text-accent hover:underline">
                View all →
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
                  <h2 className="text-xl font-semibold">{kind.label}</h2>
                  <Link href={kind.href} className="text-sm text-accent hover:underline">
                    More →
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
