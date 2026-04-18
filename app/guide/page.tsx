import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quick guide",
  description:
    "A 60-second tour of Scrap Mechanic Search Engine — browsing, signing in, voting, submitting, and suggesting tags.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-white/80">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          Quick guide
        </p>
        <h1 className="text-3xl font-bold text-white">
          How to use the site
        </h1>
        <p className="text-white/60">
          A curated directory of Scrap Mechanic Steam Workshop creations.
          Here&apos;s what you can do in about sixty seconds.
        </p>
      </header>

      <Section n={1} title="Browse without signing in">
        <p>
          Everything public is open to everyone. Start from{" "}
          <Link href="/" className="text-accent hover:underline">
            the home page
          </Link>{" "}
          or a kind&nbsp;tab ({" "}
          <Link href="/blueprints" className="text-accent hover:underline">
            Blueprints
          </Link>
          ,{" "}
          <Link href="/mods" className="text-accent hover:underline">
            Mods
          </Link>
          ,{" "}
          <Link href="/worlds" className="text-accent hover:underline">
            Worlds
          </Link>
          ,{" "}
          <Link href="/challenges" className="text-accent hover:underline">
            Challenges
          </Link>
          ,{" "}
          <Link href="/tiles" className="text-accent hover:underline">
            Tiles
          </Link>
          ). Each card links to the creation&apos;s Workshop page on Steam so
          you can subscribe in one click.
        </p>
        <p>
          Looking for something specific? Use{" "}
          <Link href="/search" className="text-accent hover:underline">
            Search
          </Link>{" "}
          — type a keyword, tick tags to narrow down (all ticked tags must
          match), and change the sort order (newest, most popular, highest
          rated, etc.).
        </p>
      </Section>

      <Section n={2} title="Sign in with Steam (optional)">
        <p>
          To vote, favourite, comment, submit items, or suggest features you
          need to sign in. Click <strong>Sign in with Steam</strong> in the
          top-right. We redirect you to Steam&apos;s official OpenID page —
          your password never touches us. On first visit we ask you to pick
          three Scrap Mechanic characters out of a line-up to confirm
          you&apos;re not a bot.
        </p>
        <p className="text-white/50">
          Accounts less than 7 days old can&apos;t submit items or features —
          a soft filter against throwaway spam accounts.
        </p>
      </Section>

      <Section n={3} title="Rate and favourite">
        <p>
          Each card shows two rating modes — the Steam rating (global votes)
          and the site rating (just people on this site). Toggle which one is
          shown with the <strong>Ratings</strong> pill in the header.
        </p>
        <p>
          On any creation page you can thumbs-up or thumbs-down, or click
          the heart to add it to{" "}
          <Link href="/me/favourites" className="text-accent hover:underline">
            Your favourites
          </Link>
          .
        </p>
      </Section>

      <Section n={4} title="Tag it">
        <p>
          Tags help everyone find creations faster. On a creation page, the
          existing tags show as chips — click the up/down arrow on any chip
          to agree or disagree. If a tag is missing, type a name in the
          &quot;Suggest another tag&quot; box; your suggestion counts as the
          first upvote.
        </p>
        <p className="text-white/50">
          A suggested tag becomes publicly visible once it has 3 net upvotes
          or a moderator confirms it.
        </p>
      </Section>

      <Section n={5} title="Submit a Workshop item">
        <p>
          Spotted a creation that belongs here but isn&apos;t listed? Paste
          its Steam Workshop URL or ID on the{" "}
          <Link href="/submit" className="text-accent hover:underline">
            Submit
          </Link>{" "}
          page. We fetch the item from Steam, auto-suggest tags with a
          keyword scorer, and queue it for a quick moderator review.
          You&apos;ll get a notification when it&apos;s approved (or if it
          gets rejected, with an optional reason).
        </p>
      </Section>

      <Section n={6} title="Ideas board">
        <p>
          Have a feature request or feedback for the site itself (not for a
          creation)? Post it on the{" "}
          <Link href="/suggestions" className="text-accent hover:underline">
            Ideas board
          </Link>
          . The community votes on what to build next.
        </p>
      </Section>

      <Section n={7} title="Report something">
        <p>
          On any creation page there&apos;s a small <em>Report</em> button.
          Pick a reason (wrong tags, spam, not Scrap Mechanic, etc.) and a
          moderator will take a look. Reports are private — your identity
          only goes to the moderation team.
        </p>
      </Section>

      <section className="space-y-3 rounded-md border border-white/10 bg-card/60 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">
          Good to know
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-white/70">
          <li>
            The site is still in beta — bugs happen. If you spot one, open an
            issue on{" "}
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              GitHub
            </a>
            .
          </li>
          <li>
            Everything runs on free-tier infrastructure — no ads, no paid
            features, no plans to add either.
          </li>
          <li>
            Read the{" "}
            <Link href="/terms" className="text-accent hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              privacy policy
            </Link>{" "}
            if you&apos;re curious about what we store.
          </li>
        </ul>
      </section>
    </article>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold text-white">
        <span className="inline-flex size-7 flex-none items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-xs text-accent">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-3 pl-10">{children}</div>
    </section>
  );
}
