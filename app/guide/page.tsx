import type { Metadata } from "next";
import Link from "next/link";
import { GuideSeenMarker } from "@/components/GuideSeenMarker";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "Tour of Scrap Mechanic Search Engine — every feature explained in one sentence, with optional deep-dives. Glossary, role explanations, and how-tos for every action.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 text-sm leading-relaxed text-foreground/80">
      <GuideSeenMarker />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">Guide</p>
        <h1 className="text-3xl font-bold text-foreground">How to use the site</h1>
        <p className="text-foreground/60">
          Each section opens with a one-line summary. Open the details below
          it if you want the full explanation. Skip to{" "}
          <a href="#glossary" className="text-accent hover:underline">
            the glossary
          </a>{" "}
          if you&apos;re just wondering what a word means, or to{" "}
          <a href="#roles" className="text-accent hover:underline">
            roles
          </a>{" "}
          to see who can do what.
        </p>
      </header>

      <TLDR />

      <Section n={1} title="Browse without signing in" summary="Everything public is open to everyone — click kind tabs or search.">
        <p>
          Start from{" "}
          <Link href="/" className="text-accent hover:underline">
            the home page
          </Link>{" "}
          or a kind tab —{" "}
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
          , etc. Each card links to the creation&apos;s Steam Workshop page so
          you can subscribe in one click.
        </p>
        <p>
          Looking for something specific?{" "}
          <Link href="/search" className="text-accent hover:underline">
            Search
          </Link>{" "}
          lets you type a keyword, tick tags to narrow down (all ticked tags
          must match), and change the sort order — newest, most popular,
          highest rated, etc.
        </p>
      </Section>

      <Section n={2} title="Sign in with Steam (optional)" summary="Only needed to vote, favourite, comment, submit, or suggest.">
        <p>
          Click <strong>Sign in with Steam</strong> in the top-right. We
          redirect you to Steam&apos;s official OpenID page — your password
          never touches us. On your first visit we ask you to identify three
          Scrap Mechanic characters out of a line-up to confirm you&apos;re a
          player. If you miss one, a &quot;Skip the puzzle&quot; button
          appears.
        </p>
        <p className="text-foreground/60">
          Accounts less than 7 days old can&apos;t submit items or feature
          ideas yet — a soft filter against throwaway spam accounts. If this
          blocks you and you&apos;re legit, a moderator can flip the bypass
          switch on your account (see{" "}
          <Link href="/verify/appeal" className="text-accent hover:underline">
            the appeal page
          </Link>
          ).
        </p>
      </Section>

      <Section n={3} title="Rate and favourite" summary="Thumbs-up / thumbs-down to vote, heart to save to your favourites.">
        <p>
          Each card shows a rating — either Steam&apos;s global rating, the
          site&apos;s own rating, or both. Toggle which one is shown with the{" "}
          <strong>Ratings</strong> pill in the header (only visible on pages
          that actually have ratings).
        </p>
        <p>
          On any creation page you can thumbs-up (+1) or thumbs-down (−1), or
          click the heart to add it to{" "}
          <Link href="/me/favourites" className="text-accent hover:underline">
            Your favourites
          </Link>
          . Clicking the same vote again removes it.
        </p>
      </Section>

      <Section n={4} title="Tag it" summary="Tags make creations findable. You can suggest new ones and upvote existing ones.">
        <p>
          On a creation page, existing tags show as little chips. Click the
          up-arrow on a chip to agree with the tag, or the down-arrow to
          disagree. If a tag is missing, type a name in the{" "}
          <em>Suggest another tag</em> box — your suggestion counts as the
          first upvote automatically.
        </p>
        <p className="text-foreground/60">
          A community-suggested tag becomes publicly visible once it has 3
          net upvotes or a moderator explicitly confirms it. Tags that get
          steady downvotes eventually drop out of view.
        </p>
      </Section>

      <Section n={5} title="Submit a Workshop item" summary="Spotted something missing? Paste its Workshop URL on the Submit page.">
        <p>
          Use the{" "}
          <Link href="/submit" className="text-accent hover:underline">
            Submit
          </Link>{" "}
          page to paste a Workshop URL or a published-file ID. We fetch the
          item from Steam, auto-suggest tags using a keyword scorer, and
          queue it for a moderator review. You&apos;ll get a notification
          (the purple bell) when it&apos;s approved, or when it&apos;s
          rejected with an optional reason.
        </p>
        <p className="text-foreground/60">
          The daily cron already pulls in popular items automatically — you
          usually only need to submit things that are under the popularity
          floor but still worth sharing.
        </p>
      </Section>

      <Section n={6} title="Ideas board" summary="Feature requests for the site itself — post one, or upvote the ones you want.">
        <p>
          The{" "}
          <Link href="/suggestions" className="text-accent hover:underline">
            Ideas board
          </Link>{" "}
          is where you tell the Creator what to build next. Post an idea,
          upvote the ones you want, and watch them move from{" "}
          <em>Approved</em> (voting open) to <em>Implemented</em> or{" "}
          <em>Rejected</em>. Rejected ideas stay visible with the
          Creator&apos;s note so you can see why they didn&apos;t make it.
        </p>
      </Section>

      <Section n={7} title="Report something" summary="Every creation has a small Report button — reports are private to moderators.">
        <p>
          On any creation page there&apos;s a <em>Report</em> button. Pick a
          reason (wrong tags, spam, not Scrap Mechanic, etc.), add optional
          details, and a moderator will review. Your identity only goes to
          the moderation team — never to the person you&apos;re reporting.
        </p>
        <p className="text-foreground/60">
          Comments on a creation have their own <em>report</em> link for
          harassment or spam. Same pipeline, different inbox.
        </p>
      </Section>

      <Section n={8} title="Comments" summary="Each creation and each user profile has a comment thread.">
        <p>
          You can post top-level comments and reply up to two levels deep.
          Vote on other people&apos;s comments with ▲ / ▼ — your own
          comments aren&apos;t votable. Deleting your own comment is a
          two-step action: the first click arms a &quot;confirm delete?&quot;
          button, the second actually deletes. Moderators can delete any
          comment.
        </p>
      </Section>

      <Section n={9} title="Notifications" summary="The purple bell in the top-right. Replies, approvals, badges, and more.">
        <p>
          Click the bell to see your unread notifications: replies to your
          comments, submission approvals/rejections, idea status changes,
          badge grants, ban/mute/warning actions on your account. Moderators
          and the Creator have extra bell tiers for their tier&apos;s queue.
        </p>
      </Section>

      <Section n={10} title="Theme + settings" summary="Light / dark / high-contrast / custom colour themes, cookie-stored.">
        <p>
          Change the theme from the header paintbrush icon or from{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Settings
          </Link>
          . The custom theme lets you pick six colours — background,
          foreground, card, accent, border, and accent-strong — saved in a
          cookie so no account needed.
        </p>
      </Section>

      {/* Bespoke layout instead of <Section> — Section's content is hidden
          inside a collapsed <details>, but the download button needs to be
          visible at a glance for this one to be useful. */}
      <section className="space-y-2">
        <h2 className="flex items-baseline gap-3 text-lg font-semibold text-foreground">
          <span className="inline-flex size-7 flex-none items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-xs text-accent">
            11
          </span>
          Browser extension (optional)
        </h2>
        <div className="pl-10 space-y-3">
          <p className="text-foreground/80">
            A tiny browser extension puts a green pill on every Scrap
            Mechanic Workshop item that&apos;s already on the site (one
            click opens it here) and an amber pill on items that
            aren&apos;t yet (one click drops you on{" "}
            <Link href="/submit" className="text-accent hover:underline">
              /submit
            </Link>{" "}
            with the URL prefilled). Strictly optional — the site works
            fine without it.
          </p>
          <p>
            <a
              href="/smse-extension.zip"
              download
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
            >
              <span aria-hidden>⬇</span> Download the extension (.zip)
            </a>
          </p>
          <details className="group">
            <summary className="cursor-pointer select-none text-xs uppercase tracking-widest text-foreground/50 hover:text-accent">
              Install instructions ▾
            </summary>
            <div className="mt-2 space-y-2 rounded-md border border-border bg-card/40 px-4 py-3 text-xs text-foreground/70">
              <p>
                <strong>Firefox:</strong> open{" "}
                <code className="rounded bg-black/30 px-1">
                  about:debugging#/runtime/this-firefox
                </code>
                , click <em>Load Temporary Add-on…</em>, pick the
                extracted folder&apos;s{" "}
                <code className="rounded bg-black/30 px-1">
                  manifest.json
                </code>
                . (Firefox unloads temporary add-ons on restart; AMO
                listing coming soon for one-click install.)
              </p>
              <p>
                <strong>Chrome / Brave / Edge:</strong> open{" "}
                <code className="rounded bg-black/30 px-1">
                  chrome://extensions
                </code>
                , toggle <em>Developer mode</em> on, click{" "}
                <em>Load unpacked</em>, pick the extracted folder. (Chrome
                Web Store listing coming soon for one-click install.)
              </p>
              <p className="text-foreground/50">
                The extension only sends the Workshop ID you&apos;re
                already looking at to{" "}
                <code className="rounded bg-black/30 px-1">
                  scrap-mechanic-search-engine.vercel.app
                </code>{" "}
                — no cookies, no tracking. Source on{" "}
                <a
                  href="https://github.com/catlandia/scrap-mechanic-search-engine/tree/main/extension"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </details>
        </div>
      </section>

      <Roles />
      <Glossary />

      <section className="space-y-3 rounded-md border border-foreground/10 bg-card/60 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/60">
          Good to know
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            The site is still in beta — bugs happen. Report them on the{" "}
            <Link href="/suggestions" className="text-accent hover:underline">
              Ideas board
            </Link>{" "}
            or on{" "}
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

function TLDR() {
  return (
    <section className="space-y-3 rounded-md border border-accent/30 bg-accent/5 px-5 py-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
        In 60 seconds
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-foreground/80">
        <li>Browse freely — sign-in is only needed to interact.</li>
        <li>Sign in with Steam, pass the character captcha once.</li>
        <li>Thumbs-up / thumbs-down on creations and comments.</li>
        <li>Tags make things findable. Suggest missing ones.</li>
        <li>
          Missing Workshop item?{" "}
          <Link href="/submit" className="text-accent hover:underline">
            Submit
          </Link>{" "}
          it. A moderator approves.
        </li>
        <li>
          Want a feature?{" "}
          <Link href="/suggestions" className="text-accent hover:underline">
            Post an idea
          </Link>
          .
        </li>
        <li>See something wrong? Report it. A moderator takes it from there.</li>
      </ul>
    </section>
  );
}

function Section({
  n,
  title,
  summary,
  children,
}: {
  n: number;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold text-foreground">
        <span className="inline-flex size-7 flex-none items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-xs text-accent">
          {n}
        </span>
        {title}
      </h2>
      <div className="pl-10 space-y-2">
        <p className="text-foreground/80">{summary}</p>
        <details className="group">
          <summary className="cursor-pointer select-none text-xs uppercase tracking-widest text-foreground/50 hover:text-accent">
            More details ▾
          </summary>
          <div className="mt-2 space-y-3 rounded-md border border-border bg-card/40 px-4 py-3">
            {children}
          </div>
        </details>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="roles" className="space-y-4 scroll-mt-20">
      <h2 className="text-2xl font-bold text-foreground">Roles on the site</h2>
      <p className="text-foreground/70">
        Most signed-in people are regular Users. The Creator can promote
        people to Moderator or Elite Moderator for extra trust and tools.
        Click each row to see what that role can do.
      </p>

      <RoleRow
        color="border-foreground/25 bg-foreground/[0.03]"
        name="User"
        summary="Anyone who signed in with Steam. Can vote, favourite, comment, submit, report, suggest ideas."
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>Upvote / downvote creations, comments, tags, and ideas.</li>
          <li>Favourite creations (shown on your profile).</li>
          <li>Post comments and replies (up to two levels deep).</li>
          <li>Submit Workshop items and suggest new tags.</li>
          <li>Report creations or comments you think are wrong.</li>
          <li>Post ideas to the Ideas board.</li>
        </ul>
      </RoleRow>

      <RoleRow
        color="border-sky-500/40 bg-sky-500/5"
        name="Moderator"
        summary="Trusted user with triage powers: approve/reject submitted items, manage tags, handle reports, issue warnings."
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Everything a User can do, plus:
          </li>
          <li>Triage queue — approve or reject newly submitted items.</li>
          <li>
            Tag queue — confirm auto-suggested tags on items that landed
            without any public tags.
          </li>
          <li>
            Create new tags and tag categories (editing existing tags is
            Creator-only).
          </li>
          <li>
            Handle reports — clear a false report or flag a creation with a
            public mod note.
          </li>
          <li>Issue warnings — a soft tool before muting / banning.</li>
          <li>
            Manually add a Workshop item that&apos;s under the
            auto-ingest floor.
          </li>
          <li>View the archive (read-only).</li>
        </ul>
      </RoleRow>

      <RoleRow
        color="border-amber-500/40 bg-amber-500/5"
        name="Elite Moderator"
        summary="Moderator + content-removal powers: archive creations and mute users."
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>Everything a Moderator can do, plus:</li>
          <li>
            <strong>Archive</strong> a creation — removes it from public
            browsing but keeps the data for possible restore.
          </li>
          <li>
            <strong>Restore</strong> a previously archived creation back to
            public.
          </li>
          <li>
            <strong>Mute</strong> a user for a chosen duration — they can
            still read but can&apos;t comment, report, or vote on tags.
          </li>
        </ul>
      </RoleRow>

      <RoleRow
        color="border-purple-500/40 bg-purple-500/5"
        name="Creator"
        summary="Site owner. Everything Elite Mods can do plus role management, bans, hard deletes, tag edits, and the Ideas inbox."
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>Everything an Elite Moderator can do, plus:</li>
          <li>Grant / revoke Moderator and Elite Moderator roles.</li>
          <li>
            <strong>Ban</strong> (temporary / permanent) and{" "}
            <strong>hard ban</strong> (prevents sign-in at all).
          </li>
          <li>Clear a user&apos;s warnings.</li>
          <li>
            <strong>Hard delete</strong> a creation — it never comes back,
            not even via re-ingest.
          </li>
          <li>Force-confirm or remove individual tags on a creation.</li>
          <li>Edit existing tags (rename slugs, move categories).</li>
          <li>Delete categories.</li>
          <li>Approve / reject / mark-implemented Ideas-board submissions.</li>
          <li>Grant or revoke badges.</li>
          <li>Toggle the 7-day Steam age-gate bypass per user.</li>
        </ul>
      </RoleRow>
    </section>
  );
}

function RoleRow({
  color,
  name,
  summary,
  children,
}: {
  color: string;
  name: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className={`group rounded-md border ${color} px-4 py-3`}>
      <summary className="flex cursor-pointer select-none items-baseline justify-between gap-3">
        <span className="text-base font-semibold text-foreground">
          {name}
        </span>
        <span className="text-xs uppercase tracking-widest text-foreground/50 group-open:opacity-0">
          tap to expand
        </span>
      </summary>
      <p className="mt-2 text-foreground/80">{summary}</p>
      <div className="mt-2 text-foreground/70">{children}</div>
    </details>
  );
}

function Glossary() {
  const terms: { term: string; def: React.ReactNode }[] = [
    {
      term: "Approved",
      def: "A creation that a moderator has greenlit — it's publicly browsable.",
    },
    {
      term: "Pending",
      def: "A creation that's been ingested or submitted but not yet reviewed. Not public.",
    },
    {
      term: "Rejected",
      def: "A creation a moderator decided doesn't belong. Won't be re-ingested.",
    },
    {
      term: "Archived",
      def: "A previously-approved creation that got pulled. Not public, but data is kept and can be restored.",
    },
    {
      term: "Tag",
      def: "A short label attached to a creation (e.g. vehicle, redstone, survival). Used for filtering on the search page.",
    },
    {
      term: "Tag suggestion",
      def: "A tag proposed by a user or the auto-tagger that hasn't reached public visibility yet. Needs 3 net upvotes or a mod confirmation to show publicly.",
    },
    {
      term: "Follow-count gate",
      def: "Minimum Steam subscriber count a creation needs before ingest pulls it in. Prevents the site from filling with untested uploads.",
    },
    {
      term: "Net votes",
      def: "Upvotes minus downvotes. A creation with 10↑ and 3↓ has a net of +7.",
    },
    {
      term: "Rating — Steam vs Site",
      def: "Steam rating is the global thumbs-up/down on Steam. Site rating is only votes from people on this site. Some creations are great on Steam but weak here, or vice versa.",
    },
    {
      term: "Age gate",
      def: "New Steam accounts (under 7 days old) can't submit items or ideas. Stops throwaway spam accounts. A mod can bypass it for a trusted individual.",
    },
    {
      term: "Flag",
      def: "A public mod note attached to a creation after an actioned report. Shows as an amber pill saying what's wrong.",
    },
    {
      term: "Warning",
      def: "Soft mod tool. Adds to a user's warning count with an internal note. Doesn't block them from posting.",
    },
    {
      term: "Mute",
      def: "Time-boxed silence. Muted users can read but can't comment, report, or vote on tags.",
    },
    {
      term: "Ban",
      def: "Full block on writes. Temporary (duration in days) or permanent (expiry set to year 9999). User still has a session but every action is rejected.",
    },
    {
      term: "Hard ban",
      def: "Nuclear option. Blocks sign-in entirely at the Steam return handler; the user can't log back in with that SteamID.",
    },
    {
      term: "Creator note",
      def: "A public message the Creator attaches to a rejected or deferred idea, explaining the decision.",
    },
    {
      term: "Cron / Ingest",
      def: "Automated job that pulls new popular Workshop items daily. You don't interact with it directly.",
    },
    {
      term: "Badge",
      def: "Little coloured pill next to a username (e.g. Beta tester, Influencer). Some auto-grant by rule, others are given by the Creator.",
    },
  ];
  return (
    <section id="glossary" className="space-y-4 scroll-mt-20">
      <h2 className="text-2xl font-bold text-foreground">Glossary</h2>
      <p className="text-foreground/60">
        The short definitions of every word that&apos;s doing specific work
        on this site.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {terms.map((t) => (
          <div
            key={t.term}
            className="rounded-md border border-border bg-card/40 px-3 py-2"
          >
            <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
            <dd className="mt-1 text-xs text-foreground/70">{t.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
