import type { Metadata } from "next";
import Link from "next/link";
import { KIND_THRESHOLDS } from "@/lib/ingest/thresholds";

export const metadata: Metadata = {
  title: "How it works — Scrap Mechanic Search Engine",
  description:
    "How creations get onto the site: auto-ingest thresholds, admin review, and community submissions.",
  alternates: { canonical: "/about" },
};

const KIND_LABELS: Record<string, string> = {
  blueprint: "Blueprints",
  mod: "Mods",
  world: "Worlds",
  challenge: "Challenge Packs",
  tile: "Tiles",
  custom_game: "Custom Games",
  terrain_asset: "Terrain Assets",
  other: "Other",
};

export default function AboutPage() {
  const thresholdRows = Object.entries(KIND_THRESHOLDS).map(([kind, t]) => ({
    kind,
    label: KIND_LABELS[kind] ?? kind,
    minSubs: t.minSubscriptions,
    minAgeDays: t.minAgeDays,
  }));

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">How it works</h1>
        <p className="text-sm text-foreground/60">
          What gets onto the site, and why.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The short version</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Scrap Mechanic&apos;s Workshop has thousands of items. Most of them
          are abandoned first-attempts, duplicates, or very low effort. The
          goal here is to surface the genuinely worth-your-time creations
          without drowning them in noise.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Three things together decide whether a creation ends up here:{" "}
          <strong>an automated quality filter</strong>,{" "}
          <strong>human review</strong>, and{" "}
          <strong>community submissions</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Auto-ingest</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every day a cron job queries the Steam Workshop API for each kind
          (blueprints, mods, worlds, …), sorted by trending, and pulls the
          most engaging items. Two gates apply before a creation is even
          considered:
        </p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-foreground/80">
          <li>
            <strong>Subscriber count</strong> is above a kind-specific minimum
            — this is the single best proxy for &quot;people found this useful
            enough to save.&quot;
          </li>
          <li>
            <strong>At least a few days old</strong>, so Steam&apos;s initial
            thumbs-up/down spike has time to settle into a real signal.
          </li>
        </ul>

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/80 text-left text-xs uppercase tracking-wider text-foreground/50">
              <tr>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Min. subscribers</th>
                <th className="px-3 py-2 font-medium">Min. age</th>
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
                    {r.minAgeDays} {r.minAgeDays === 1 ? "day" : "days"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground/50">
          These thresholds are tuned against what actually shows up on Steam.
          Mods have a lower bar than blueprints because mods are rarer and
          harder to find on the Workshop&apos;s native browser.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Human review</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Passing the auto-filter gets an item into a <em>pending</em> queue
          — it does <strong>not</strong> make it public. A moderator reviews
          every pending item and either approves it (it goes live) or rejects
          it (it never appears). The filter is a first pass, not the final
          word; a blueprint with 5 000 subscribers that turns out to be a
          re-upload or meme doesn&apos;t get through.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          This is why the site is smaller than Steam&apos;s Workshop
          browser, and deliberately so.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Community submissions</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          The auto-ingest only looks at what&apos;s trending. Hidden gems
          that never went viral get missed. If you have one — yours or
          someone else&apos;s — drop its Workshop URL at{" "}
          <Link href="/submit" className="text-accent hover:underline">
            /submit
          </Link>
          . It lands in the same review queue as the auto-pulled items. No
          subscriber threshold applies — a moderator just eyeballs whether
          it&apos;s worth including.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Submitters get a credit badge on the creation page once it&apos;s
          approved, and a notification when the review is complete.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          What if a creation shouldn&apos;t be here?
        </h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every creation has a <strong>Report</strong> button next to its
          Steam link. Reasons include wrong tags, poor quality, spam, and
          &quot;not Scrap Mechanic.&quot; Reports go to the moderator queue
          and get handled case-by-case — either a public mod note is added,
          the creation is archived, or the report is dismissed.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Comments can also be reported individually if something&apos;s off.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Costs &amp; sustainability</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          The site runs entirely on free tiers — Vercel Hobby, Neon
          Postgres, Steam&apos;s Web API. No paid AI APIs, no per-request
          billing, no revenue goals. That&apos;s a deliberate constraint:
          the project is designed to keep running indefinitely without
          anyone needing to pay for it.
        </p>
      </section>
    </article>
  );
}
