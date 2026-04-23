import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  effectiveRole,
  isCreator,
  isEliteModerator,
  isModerator,
} from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin guide",
  description: "Per-role playbook for moderators, elite moderators, and the creator.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  const user = await getCurrentUser();
  const role = effectiveRole(user);
  const mod = isModerator(role);
  const elite = isEliteModerator(role);
  const creator = isCreator(role);
  if (!mod) return null;

  return (
    <article className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-foreground/80">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          Admin guide
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Your moderation playbook
        </h1>
        <p className="text-foreground/60">
          Each role starts with a short &quot;what you do&quot; card. Open
          the details for the full walk-through. Terms are defined in the
          public{" "}
          <Link href="/guide#glossary" className="text-accent hover:underline">
            glossary
          </Link>
          .
        </p>
      </header>

      <nav className="rounded-md border border-border bg-card/60 px-4 py-3">
        <p className="mb-2 text-xs uppercase tracking-widest text-foreground/40">
          On this page
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <li>
            <a href="#moderator" className="text-foreground/70 hover:text-accent">
              Moderator
            </a>
          </li>
          {elite && (
            <li>
              <a href="#elite" className="text-foreground/70 hover:text-accent">
                Elite moderator
              </a>
            </li>
          )}
          {creator && (
            <li>
              <a href="#creator" className="text-foreground/70 hover:text-accent">
                Creator
              </a>
            </li>
          )}
          <li>
            <a href="#house-rules" className="text-foreground/70 hover:text-accent">
              House rules
            </a>
          </li>
          <li>
            <a href="#escalation" className="text-foreground/70 hover:text-accent">
              Escalation ladder
            </a>
          </li>
        </ul>
      </nav>

      <RoleOverview
        id="moderator"
        tier="mod"
        title="Moderator"
        oneLine="Approve / reject submitted items, confirm tags, handle reports, issue warnings."
        dailyJob={
          <>
            <li>
              Clear{" "}
              <Link href="/admin/triage" className="text-accent hover:underline">
                /admin/triage
              </Link>{" "}
              — approve or reject new items.
            </li>
            <li>
              Clean{" "}
              <Link href="/admin/queue" className="text-accent hover:underline">
                /admin/queue
              </Link>{" "}
              — confirm tags on approved-but-tagless items so they&apos;re
              findable.
            </li>
            <li>
              Triage{" "}
              <Link href="/admin/reports" className="text-accent hover:underline">
                /admin/reports
              </Link>{" "}
              — clear false flags or action genuine problems.
            </li>
          </>
        }
      >
        <Step title="Triage — approving or rejecting new items">
          <p>
            <Link href="/admin/triage" className="text-accent hover:underline">
              /admin/triage
            </Link>{" "}
            lists up to 50 pending items, sorted by Steam subscriber count
            (most popular first — highest-confidence approvals). Each card
            shows the thumbnail, title, Steam metadata, and auto-suggested
            tags with confidence scores.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Approve</strong> sets the
              item to <Pill>approved</Pill> and confirms any tags you&apos;ve
              ticked. Goes public immediately.
            </li>
            <li>
              <strong className="text-foreground">Quick Approve</strong>{" "}
              publishes without confirming tags. Auto-suggestions stay as
              unconfirmed community candidates; voters decide visibility.
              Use when the tags look right and you want to keep moving.
            </li>
            <li>
              <strong className="text-foreground">Reject</strong> marks the
              item <Pill>rejected</Pill> (won&apos;t be re-ingested). The
              Reason field is optional; filled reasons go to the
              submitter&apos;s rejection notification — helpful for
              user-submitted items, rarely needed for cron-ingested ones.
            </li>
          </ul>
          <Callout tone="info">
            The tagger only runs on insert, not on updates. If you re-ingest
            later, your confirmed tags are preserved — you never lose triage
            work to a re-fetch.
          </Callout>
          <CommonMistake>
            Rejecting without a reason on a user submission. The submitter
            gets a bare &quot;rejected&quot; notification and nothing to
            learn from. Two words is enough —{" "}
            <em>wrong kind</em> / <em>duplicate of #1234</em> / <em>not SM</em>.
          </CommonMistake>
        </Step>

        <Step title="Tag queue — fixing approved-but-tagless items">
          <p>
            <Link href="/admin/queue" className="text-accent hover:underline">
              /admin/queue
            </Link>{" "}
            catches items that got approved but have no publicly visible
            tags — no admin-confirmed tag and fewer than 3 net community
            upvotes on any suggestion. Confirm or dismiss the keyword
            suggestions so the item becomes findable via tag search.
          </p>
        </Step>

        <Step title="Tags — creating new tags and categories">
          <p>
            <Link href="/admin/tags" className="text-accent hover:underline">
              /admin/tags
            </Link>{" "}
            lets you add a new tag slug or category. Keep tag slugs short,
            lowercase, and hyphenated (<Pill>warship</Pill>,{" "}
            <Pill>house-on-wheels</Pill>). Categories are the broad buckets
            tags roll up into (Vehicle, Building, Mechanism, etc.).
            Don&apos;t create a category just for one tag.
          </p>
          <p>
            <strong className="text-foreground">Editing an existing tag</strong>{" "}
            (fix a misspelled slug, re-bucket it) is Creator-only — click
            any tag chip on the page to open an inline edit form. Slug
            changes break any bookmarked{" "}
            <Pill>/search?tags=&lt;old&gt;</Pill> URL, so be deliberate with
            renames.
          </p>
        </Step>

        <Step title="Reports — handling community reports">
          <p>
            <Link href="/admin/reports" className="text-accent hover:underline">
              /admin/reports
            </Link>{" "}
            lists community reports moving from <Pill>open</Pill> →{" "}
            <Pill>cleared</Pill> or <Pill>actioned</Pill>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Clear</strong> — the
              report is baseless or already handled. Creation stays public.
            </li>
            <li>
              <strong className="text-foreground">Action</strong> — attach a
              public mod note to the creation (amber &quot;flagged&quot;
              pill). Creation stays public but now carries a visible caveat.
            </li>
            <li>
              <strong className="text-foreground">Archive from report</strong>{" "}
              — elite+ only. Removes the creation and actions the report in
              one step. If you&apos;re a regular mod and a creation really
              needs to come down, clear the report and ping an elite mod.
            </li>
          </ul>
        </Step>

        <Step title="Warnings — the soft tool">
          <p>
            From a user&apos;s row in{" "}
            <Link href="/admin/users" className="text-accent hover:underline">
              /admin/users
            </Link>
            , issue a warning with a short internal note. Increments their
            warnings count and shows the note on their profile to other
            mods. Doesn&apos;t block them from posting.
          </p>
          <p>Good first warning uses:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Mildly off-topic comments or misleading tag suggestions.</li>
            <li>Low-quality submissions that don&apos;t meet the bar yet.</li>
            <li>Borderline hostile tone in a comment thread.</li>
          </ul>
          <Callout tone="info">
            Warnings are the first rung of the escalation ladder: warn →
            mute → ban → hard ban. Skipping rungs is how a mod team loses
            community trust.
          </Callout>
        </Step>

        <Step title="Archive — view-only for you">
          <p>
            <Link href="/admin/archive" className="text-accent hover:underline">
              /admin/archive
            </Link>{" "}
            shows items elite mods or the Creator have archived. You can
            inspect them, but can&apos;t restore or re-archive — those
            actions are elite+.
          </p>
        </Step>
      </RoleOverview>

      {elite && (
        <RoleOverview
          id="elite"
          tier="elite"
          title="Elite Moderator"
          oneLine="Moderator + remove-content powers: archive creations and mute users."
          dailyJob={
            <>
              <li>
                Handle &quot;Archive from report&quot; on genuinely harmful
                creations in{" "}
                <Link href="/admin/reports" className="text-accent hover:underline">
                  /admin/reports
                </Link>
                .
              </li>
              <li>
                Review and reverse mistakes from{" "}
                <Link href="/admin/archive" className="text-accent hover:underline">
                  /admin/archive
                </Link>
                .
              </li>
              <li>
                Mute users whose comment behaviour is past warnings but not
                yet ban-worthy.
              </li>
            </>
          }
        >
          <p>
            You get everything a regular moderator has, plus the ability to
            remove content from the site and mute users. These are visible
            to the Creator and to every other mod tier — use them sparingly.
          </p>

          <Step title="Archiving a creation">
            <p>
              From the creation detail page, or from{" "}
              <Link href="/admin/reports" className="text-accent hover:underline">
                /admin/reports
              </Link>{" "}
              via &quot;Archive from report&quot;, you can move an approved
              item to <Pill>archived</Pill>. The item disappears from public
              browsing but the data is preserved. An audit report is
              auto-created so the decision has a paper trail.
            </p>
          </Step>

          <Step title="Restoring from archive">
            <p>
              <Link href="/admin/archive" className="text-accent hover:underline">
                /admin/archive
              </Link>{" "}
              — each archived card has a &quot;Restore&quot; action that
              flips the status back to <Pill>approved</Pill> and clears any
              actioned reports on it. Use when an archive decision was wrong.
            </p>
          </Step>

          <Step title="Muting users">
            <p>
              Mutes are time-boxed (pick a duration, or &quot;perma&quot;)
              and issued from{" "}
              <Link href="/admin/users" className="text-accent hover:underline">
                /admin/users
              </Link>
              . A muted user keeps their votes on existing content but
              cannot post new comments, file reports, favourite, or vote on
              tags.
            </p>
            <p>
              Always include a mute reason — the user sees it on their
              profile.
            </p>
            <Callout tone="warn">
              If a muted user signs in on a new account to evade, that&apos;s
              the Creator&apos;s hard-ban problem. Flag the new account via
              a warning note or out-of-band message to the Creator.
            </Callout>
          </Step>
        </RoleOverview>
      )}

      {creator && (
        <RoleOverview
          id="creator"
          tier="creator"
          title="Creator"
          oneLine="You own the site. Role management, bans, hard deletes, tag edits, the Ideas inbox, badges — and every action below."
          dailyJob={
            <>
              <li>
                Approve / reject / mark-implemented ideas on{" "}
                <Link href="/admin/suggestions" className="text-accent hover:underline">
                  /admin/suggestions
                </Link>
                .
              </li>
              <li>
                Keep an eye on{" "}
                <Link href="/admin/reports" className="text-accent hover:underline">
                  /admin/reports
                </Link>{" "}
                for anything mods escalated.
              </li>
              <li>
                Periodically check{" "}
                <Link href="/admin/ingest" className="text-accent hover:underline">
                  /admin/ingest
                </Link>{" "}
                for cron errors — low-priority but easy to miss. Manual
                ingest runs and{" "}
                <Link href="/admin/add" className="text-accent hover:underline">
                  /admin/add
                </Link>{" "}
                (pulling in individual Workshop URLs) are Creator-only since
                BETA 3.0.
              </li>
            </>
          }
        >
          <p>
            Every lower-tier power is yours, plus the irreversible stuff.
            Read each action twice before clicking.
          </p>

          <Step title="User role management">
            <p>
              <Link href="/admin/users" className="text-accent hover:underline">
                /admin/users
              </Link>{" "}
              groups users by role. Promote a trusted community member to{" "}
              <strong className="text-foreground">Moderator</strong> (triage
              + warnings) or{" "}
              <strong className="text-foreground">Elite Moderator</strong>{" "}
              (adds archive + mute). The Creator role itself is owned by
              the <Pill>CREATOR_STEAMID</Pill> env var and can&apos;t be
              assigned from the UI. You can&apos;t modify your own role.
            </p>
          </Step>

          <Step title="Bans (temporary, permanent, hard)">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Temporary ban</strong> —
                duration in days. Expires automatically; the user regains
                full access when the clock runs out.
              </li>
              <li>
                <strong className="text-foreground">Permanent ban</strong> —
                expiry set to year 9999. Session cookie still exists but
                every write blocks and the user renders as a ghost in UI.
              </li>
              <li>
                <strong className="text-foreground">Hard ban</strong> — the
                nuclear option. Blocks sign-in entirely at the Steam return
                handler. Existing sessions die. The user can&apos;t log back
                in on the same SteamID.
              </li>
              <li>
                <strong className="text-foreground">Clear warnings</strong>{" "}
                — wipes the warnings count and note. Use when someone has
                reformed and the slate should be clean.
              </li>
              <li>
                <strong className="text-foreground">
                  Allow young account / Revoke age bypass
                </strong>{" "}
                — toggles the 7-day Steam account-age gate per user. Flip on
                for trusted community members with a fresh Steam account.
              </li>
            </ul>
            <CommonMistake>
              Using hard ban for a first-time offender. Hard ban is
              essentially a permanent block at the identity layer — save it
              for abuse that would otherwise warrant a police report. For
              anything else, walk the ladder.
            </CommonMistake>
          </Step>

          <Step title="Hard-deleting a creation">
            <p>
              From the creation detail page, Creator sees a permanent
              delete action. Sets status to <Pill>deleted</Pill> — the item
              will never be re-ingested (deleted rows stay in the DB as a
              blocklist). Reports wiped. Use when content is so bad that
              archival history shouldn&apos;t hold it (DMCA, illegal,
              doxxing).
            </p>
          </Step>

          <Step title="Removing tags from a creation (creator bypass)">
            <p>
              On <Pill>/creation/[id]</Pill>, every visible tag has an
              &quot;×&quot; remove button for Creators. Sets the tag&apos;s{" "}
              <Pill>rejected=true</Pill> flag, which overrides all community
              votes and admin confirmations — the tag never appears on that
              creation again. Creator-only so mods can&apos;t casually undo
              community consensus.
            </p>
          </Step>

          <Step title="Managing the Ideas board">
            <p>
              <Link href="/admin/suggestions" className="text-accent hover:underline">
                /admin/suggestions
              </Link>{" "}
              has four buckets:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Inbox</strong> —{" "}
                <Pill>submitted</Pill> ideas waiting for a decision. Approve
                (goes to the live board) or reject (with an optional reason
                shown to the submitter).
              </li>
              <li>
                <strong className="text-foreground">Live board</strong> —
                public, taking votes. Mark as{" "}
                <strong className="text-foreground">Implemented</strong>{" "}
                when you ship the feature — sends a notification to the
                submitter (small dopamine hit keeping people engaged).
              </li>
              <li>
                <strong className="text-foreground">Implemented</strong> /{" "}
                <strong className="text-foreground">Rejected</strong> —
                archival states. Anything can be reverted to{" "}
                <Pill>approved</Pill> if you change your mind.
              </li>
            </ul>
            <p>
              Each card has a{" "}
              <strong className="text-foreground">Creator note</strong>{" "}
              field — inline editable, shown publicly on the live board.
              Use it to explain a rejection or a deferred decision.
            </p>
            <p>
              <strong className="text-foreground">Hard delete</strong> (🗑)
              wipes a suggestion and its votes — no audit trail. Only use
              for spam, abuse, or duplicates.
            </p>
          </Step>

          <Step title="Manual add — pulling in items the cron missed">
            <p>
              <Link href="/admin/add" className="text-accent hover:underline">
                /admin/add
              </Link>{" "}
              takes a Steam Workshop URL or a raw publishedfileid, bypassing
              the follower-count floor. Small gems that never trended still
              get a path onto the site. Creator-only since BETA 3.0 — every
              direct add reshapes the public catalogue and should only
              happen on your judgement, not a moderator&apos;s.
            </p>
          </Step>

          <Step title="Ingest runs">
            <p>
              <Link href="/admin/ingest" className="text-accent hover:underline">
                /admin/ingest
              </Link>{" "}
              lists recent cron runs + errors and lets you kick off a manual
              run (pages per kind, max 20). Each run burns Steam API quota,
              so use sparingly. Creator-only since BETA 3.0.
            </p>
          </Step>

          <Step title="Badges">
            <p>
              From{" "}
              <Link href="/admin/badges" className="text-accent hover:underline">
                /admin/badges
              </Link>{" "}
              you manage the auto-grant list for the Influencer badge (add
              a Steam profile URL and a memo). Per-user manual grants happen
              on each user&apos;s row in{" "}
              <Link href="/admin/users" className="text-accent hover:underline">
                /admin/users
              </Link>
              . Some badges (like Beta tester) auto-apply by date rule and
              aren&apos;t managed here.
            </p>
          </Step>
        </RoleOverview>
      )}

      <HouseRules />
      <EscalationLadder />
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RoleOverview({
  id,
  tier,
  title,
  oneLine,
  dailyJob,
  children,
}: {
  id: string;
  tier: "mod" | "elite" | "creator";
  title: string;
  oneLine: string;
  dailyJob: React.ReactNode;
  children: React.ReactNode;
}) {
  const tierStyles = {
    mod: "border-sky-500/40 bg-sky-500/5",
    elite: "border-amber-500/40 bg-amber-500/5",
    creator: "border-purple-500/40 bg-purple-500/5",
  } as const;
  return (
    <section
      id={id}
      className={`scroll-mt-20 space-y-4 rounded-md border ${tierStyles[tier]} px-5 py-5`}
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-foreground/80">{oneLine}</p>
      </header>

      <div className="rounded-md border border-foreground/10 bg-background/40 px-4 py-3">
        <p className="mb-1 text-xs uppercase tracking-widest text-foreground/50">
          On a normal day you
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          {dailyJob}
        </ul>
      </div>

      <details className="group">
        <summary className="cursor-pointer select-none text-xs uppercase tracking-widest text-foreground/50 hover:text-accent">
          Full playbook ▾
        </summary>
        <div className="mt-3 space-y-4">{children}</div>
      </details>
    </section>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-1.5 text-foreground/70">{children}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/40 px-1 text-[0.85em] text-foreground/90">
      {children}
    </code>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "info" | "warn";
  children: React.ReactNode;
}) {
  const toneStyles =
    tone === "warn"
      ? "border-red-500/30 bg-red-500/5 text-red-100/90"
      : "border-amber-500/30 bg-amber-500/5 text-amber-100/90";
  return (
    <aside
      className={`rounded-md border ${toneStyles} px-3 py-2 text-xs`}
    >
      {children}
    </aside>
  );
}

function CommonMistake({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-100/90">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-red-300">
        Common mistake
      </div>
      {children}
    </aside>
  );
}

function HouseRules() {
  return (
    <section
      id="house-rules"
      className="scroll-mt-20 space-y-3 rounded-md border border-foreground/15 bg-foreground/[0.02] px-5 py-5"
    >
      <h2 className="text-xl font-semibold text-foreground">House rules</h2>
      <p className="text-foreground/70">
        Principles that apply to every tier. Non-binding — use your
        judgement — but breaking them repeatedly is how a community loses
        trust in its mod team.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-foreground/70">
        <li>
          <strong className="text-foreground">
            Warn before you mute, mute before you ban.
          </strong>{" "}
          Every user gets one chance to correct their behaviour before
          silencing, and a time-boxed silence before a full ban.
        </li>
        <li>
          <strong className="text-foreground">Leave a paper trail.</strong>{" "}
          Every mute, ban, and hard delete gets a note (mute reason, ban
          reason, warning note). Future-you and other mods will thank you.
        </li>
        <li>
          <strong className="text-foreground">
            Don&apos;t moderate content you have a stake in.
          </strong>{" "}
          If a comment is about your own submission, ask another mod to
          handle it.
        </li>
        <li>
          <strong className="text-foreground">
            Quick Approve when confident, full triage when unsure.
          </strong>{" "}
          The tag queue backstops mistakes — don&apos;t let triage become a
          bottleneck.
        </li>
        <li>
          <strong className="text-foreground">Hard ban is forever.</strong>{" "}
          Save it for abuse that would otherwise warrant a police report —
          slurs, targeted harassment, sexual content involving minors, etc.
        </li>
      </ul>
    </section>
  );
}

function EscalationLadder() {
  return (
    <section
      id="escalation"
      className="scroll-mt-20 space-y-3 rounded-md border border-foreground/15 bg-foreground/[0.02] px-5 py-5"
    >
      <h2 className="text-xl font-semibold text-foreground">
        Escalation ladder
      </h2>
      <p className="text-foreground/70">
        When something&apos;s clearly wrong but you&apos;re unsure of the
        right tier to handle it, this is the order:
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-foreground/70">
        <li>
          <strong className="text-foreground">Warning (any mod)</strong> —
          first response to most offences. Internal note only, user sees a
          soft nudge.
        </li>
        <li>
          <strong className="text-foreground">Mute (elite+)</strong> — for
          repeated or tone-level problems. Time-boxed.
        </li>
        <li>
          <strong className="text-foreground">Temporary ban (creator)</strong>{" "}
          — for serious but not pattern-level behaviour (e.g. one bad day).
        </li>
        <li>
          <strong className="text-foreground">Permanent ban (creator)</strong>{" "}
          — for proven pattern abuse. User&apos;s session dies, writes are
          blocked, but the SteamID isn&apos;t blacklisted.
        </li>
        <li>
          <strong className="text-foreground">Hard ban (creator)</strong> —
          SteamID blacklisted. Never comes back. For abuse with legal or
          safety dimensions.
        </li>
      </ol>
      <p className="text-foreground/60">
        Skipping rungs is sometimes right (hard-ban a SWATter on sight),
        but skipping up the ladder without a clear reason is how mod teams
        lose community trust. When in doubt, one rung at a time.
      </p>
    </section>
  );
}
