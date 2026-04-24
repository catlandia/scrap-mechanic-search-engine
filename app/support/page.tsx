import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support the site",
  description:
    "Concrete ways you can help keep the Scrap Mechanic Search Engine running and growing — from sharing links to flagging bugs.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          Get involved
        </p>
        <h1 className="text-3xl font-bold">How you can help</h1>
        <p className="text-sm text-foreground/70">
          The site runs on free tiers right now, which keeps it online but
          not self-growing — it stays useful because people like you pitch
          in. Here&apos;s everything that actually moves the needle.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Spread the word</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Most people hunting for Scrap Mechanic creations still dig through
          Steam&apos;s native Workshop browser. Telling a friend, posting a
          link in a Discord, or sharing a creation on Reddit is by far the
          single biggest thing you can do.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every creation page now has a <strong>Share</strong> button next to{" "}
          <em>View on Steam Workshop</em> — one click copies the link.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          There&apos;s also a{" "}
          <a
            href="https://steamcommunity.com/groups/scrapmechanicsearchengine"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            Steam Group
          </a>
          {" "}— joining is free and members get announcements in their Steam
          client when new picks are posted.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Submit creations we&apos;ve missed</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          The auto-ingest only picks up trending items. Hidden gems that
          never went viral slip through. If you have one in mind — your own
          or someone else&apos;s — drop the Workshop URL at{" "}
          <Link href="/submit" className="text-accent hover:underline">
            /submit
          </Link>
          . A moderator reviews it and it goes live.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Vote and tag</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every approved creation has up/down votes and a community tag
          system. The more people who vote on creations, the better the
          rating sorts work. If a creation is missing a tag you&apos;d search
          for — add it. At +3 net votes, it becomes visible to everyone.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Report what&apos;s wrong</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every creation page has a <strong>Report</strong> button. Wrong
          tags, low quality, spam, missing co-authors — if something&apos;s
          off, flag it. A moderator handles it and the catalogue gets a
          little better.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Individual comments can be reported too.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Suggest features</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Almost every meaningful improvement to the site came from a user
          idea. Drop yours on the{" "}
          <Link href="/suggestions" className="text-accent hover:underline">
            ideas board
          </Link>{" "}
          — it&apos;s a public, voted, triaged list, not a black hole.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Flag bugs</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Found something broken, ugly, or unclear? Post it on the ideas
          board with the bug tag or open an issue on{" "}
          <a
            href="https://github.com/catlandia/scrap-mechanic-search-engine"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
          . Verified bug reports earn the 🐛{" "}
          <strong>Bug hunter</strong> badge.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Money support</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Right now there&apos;s no way to donate — I haven&apos;t set up a
          Patreon, Ko-fi, or anything similar yet. But if the site grows,
          it&apos;ll eventually outgrow the free tiers, and at that point
          financial support would genuinely help keep it online and
          improving. If you&apos;d like to contribute that way later, check
          back — I&apos;ll add a link here when something&apos;s set up.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">
          In the meantime the items above are the most useful things you
          can do.
        </p>
      </section>
    </article>
  );
}
