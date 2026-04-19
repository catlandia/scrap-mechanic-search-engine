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
  description: "Reference for moderator, elite moderator, and creator tools.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  const user = await getCurrentUser();
  // Layout already gates /admin/* to moderators; effectiveRole here just
  // tells us which sections to render. If somehow a non-mod slips through,
  // the layout-level check would already have returned early.
  const role = effectiveRole(user);
  const mod = isModerator(role);
  const elite = isEliteModerator(role);
  const creator = isCreator(role);

  if (!mod) return null;

  const toc: Array<{ id: string; label: string; visible: boolean }> = [
    { id: "moderator", label: "Moderator tools", visible: mod },
    { id: "elite", label: "Elite moderator tools", visible: elite },
    { id: "creator", label: "Creator tools", visible: creator },
    { id: "house-rules", label: "House rules", visible: mod },
  ];

  return (
    <article className="mx-auto max-w-3xl space-y-10 text-sm leading-relaxed text-foreground/80">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">
          Admin guide
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          How to use your moderation tools
        </h1>
        <p className="text-foreground/60">
          Only sections for your current tier are shown. Elite moderators and
          the creator inherit everything in the tier(s) below theirs.
        </p>
      </header>

      <nav className="rounded-md border border-border bg-card/60 px-4 py-3">
        <p className="mb-2 text-xs uppercase tracking-widest text-foreground/40">
          On this page
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {toc
            .filter((t) => t.visible)
            .map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="text-foreground/70 hover:text-accent"
                >
                  {t.label}
                </a>
              </li>
            ))}
        </ul>
      </nav>

      {mod && <ModeratorSection />}
      {elite && <EliteSection />}
      {creator && <CreatorSection />}

      {mod && <HouseRules />}
    </article>
  );
}

function Section({
  id,
  title,
  tier,
  children,
}: {
  id: string;
  title: string;
  tier: "mod" | "elite" | "creator" | "rules";
  children: React.ReactNode;
}) {
  const tierStyles = {
    mod: "border-sky-500/40 bg-sky-500/5",
    elite: "border-amber-500/40 bg-amber-500/5",
    creator: "border-purple-500/40 bg-purple-500/5",
    rules: "border-foreground/15 bg-white/[0.02]",
  } as const;
  const tierLabels = {
    mod: "Moderator",
    elite: "Elite moderator",
    creator: "Creator",
    rules: "All tiers",
  } as const;
  return (
    <section
      id={id}
      className={`space-y-4 rounded-md border ${tierStyles[tier]} px-5 py-5 scroll-mt-20`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <span className="text-[10px] uppercase tracking-widest text-foreground/50">
          {tierLabels[tier]}
        </span>
      </div>
      <div className="space-y-4">{children}</div>
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

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
      {children}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ModeratorSection() {
  return (
    <Section id="moderator" title="Moderator tools" tier="mod">
      <Step title="Triage — approving or rejecting new items">
        <p>
          <Link href="/admin/triage" className="text-accent hover:underline">
            /admin/triage
          </Link>{" "}
          lists up to 50 pending items, sorted by Steam subscriber count (most
          popular first — highest-confidence approvals). Each card shows the
          thumbnail, title, Steam metadata, and auto-suggested tags with
          confidence scores.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            <strong className="text-foreground">Approve</strong> — sets the item to
            <code className="mx-1 rounded bg-black/40 px-1">approved</code> and
            confirms any tags you&apos;ve ticked. Approved items go public
            immediately.
          </li>
          <li>
            <strong className="text-foreground">Quick Approve</strong> — publishes
            the item without confirming tags. The auto-suggestions stay as
            unconfirmed community candidates; voters decide visibility.
          </li>
          <li>
            <strong className="text-foreground">Reject</strong> — marks the item
            rejected (won&apos;t be re-ingested). The &quot;Reason&quot; field
            is optional; if filled, it&apos;s appended to the submitter&apos;s
            rejection notification — helpful for user-submitted items, rarely
            needed for cron-ingested ones.
          </li>
        </ul>
        <Callout>
          Tags only run through the auto-tagger on insert, not on updates. If
          you re-ingest later, your confirmed tags are preserved — you never
          lose triage work to a re-fetch.
        </Callout>
      </Step>

      <Step title="Tag queue — fixing approved-but-tagless items">
        <p>
          <Link href="/admin/queue" className="text-accent hover:underline">
            /admin/queue
          </Link>{" "}
          catches items that got approved but have no publicly visible tags
          (no admin-confirmed tags and fewer than 3 net community upvotes on
          any suggestion). Confirm or dismiss the keyword suggestions so the
          item becomes findable via tag search.
        </p>
      </Step>

      <Step title="Tags — creating new tags and categories">
        <p>
          <Link href="/admin/tags" className="text-accent hover:underline">
            /admin/tags
          </Link>{" "}
          lets you add a new tag slug or category. Keep tag slugs short,
          lowercase, and hyphenated (<code className="rounded bg-black/40 px-1">warship</code>,
          <code className="mx-1 rounded bg-black/40 px-1">house-on-wheels</code>).
          Categories are the broad buckets tags roll up into (Vehicle,
          Building, Mechanism, etc.). Don&apos;t create a category just for
          one tag.
        </p>
        <p className="text-foreground/60">
          <strong className="text-foreground">Editing an existing tag</strong> (fix
          a misspelled slug, re-bucket it under a different category) is
          creator-only — click any tag chip on the page to open an inline
          edit form. Slug changes break any bookmarked{" "}
          <code className="rounded bg-black/40 px-1">/search?tags=&lt;old&gt;</code>{" "}
          URL, so be deliberate with renames.
        </p>
      </Step>

      <Step title="Reports — handling community reports">
        <p>
          <Link href="/admin/reports" className="text-accent hover:underline">
            /admin/reports
          </Link>{" "}
          lists community reports with status{" "}
          <code className="rounded bg-black/40 px-1">open</code> →{" "}
          <code className="rounded bg-black/40 px-1">cleared</code> or{" "}
          <code className="rounded bg-black/40 px-1">actioned</code>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            <strong className="text-foreground">Clear</strong> — the report is
            baseless or already handled. Creation stays public.
          </li>
          <li>
            <strong className="text-foreground">Archive from report</strong> — (elite+)
            removes the creation from the site and actions the report in one
            step. If you&apos;re a regular mod and the creation genuinely
            needs to come down, clear the report and ask an elite to handle
            the archive.
          </li>
        </ul>
      </Step>

      <Step title="Warnings — the soft tool">
        <p>
          On any user&apos;s profile via{" "}
          <Link href="/admin/users" className="text-accent hover:underline">
            /admin/users
          </Link>{" "}
          (read-only for non-creators, but the warn action is mod-level) you
          can issue a warning with a short note. This increments the
          user&apos;s warnings count and shows the note on their profile to
          other mods. It does <em>not</em> block them from posting. Use
          warnings before escalating to a mute or ban.
        </p>
        <p>Good first warning uses:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>Mildly off-topic comments or misleading tags</li>
          <li>Low-quality submissions that don&apos;t meet the bar yet</li>
          <li>Borderline hostile tone in a comment thread</li>
        </ul>
      </Step>

      <Step title="Manual add — pulling in items the cron missed">
        <p>
          <Link href="/admin/add" className="text-accent hover:underline">
            /admin/add
          </Link>{" "}
          takes a Steam Workshop URL or a raw publishedfileid. The system
          fetches the item, auto-tags it, and inserts it into triage. Useful
          for items below the auto-ingest follower-count floor that you think
          deserve to be on the site anyway.
        </p>
      </Step>

      <Step title="Ingest run history">
        <p>
          <Link href="/admin/ingest" className="text-accent hover:underline">
            /admin/ingest
          </Link>{" "}
          shows the cron&apos;s recent runs and any errors. You can also
          manually trigger a run (default 1 page per kind, max 20). Use
          sparingly — each run burns Steam API quota.
        </p>
      </Step>

      <Step title="Archive — view-only for you">
        <p>
          <Link href="/admin/archive" className="text-accent hover:underline">
            /admin/archive
          </Link>{" "}
          shows items that elites or the creator have archived. You can
          inspect them, but cannot restore or re-archive — those actions are
          elite and above.
        </p>
      </Step>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EliteSection() {
  return (
    <Section id="elite" title="Elite moderator tools" tier="elite">
      <p className="text-foreground/70">
        As an elite moderator you get everything a regular moderator has,
        plus the ability to remove content from the site and mute users. Use
        these sparingly — they&apos;re visible to the creator and to every
        other mod tier.
      </p>

      <Step title="Archiving a creation">
        <p>
          On the creation detail page, or from{" "}
          <Link href="/admin/reports" className="text-accent hover:underline">
            /admin/reports
          </Link>{" "}
          via &quot;Archive from report&quot;, you can move an approved item
          to{" "}
          <code className="rounded bg-black/40 px-1">archived</code>. Archived
          items disappear from public browsing but the data is preserved. An
          audit report is auto-created so the decision has a paper trail.
        </p>
      </Step>

      <Step title="Restoring from archive">
        <p>
          <Link href="/admin/archive" className="text-accent hover:underline">
            /admin/archive
          </Link>{" "}
          — each archived card has a &quot;Restore&quot; action that flips
          the status back to{" "}
          <code className="rounded bg-black/40 px-1">approved</code> and
          clears any actioned reports on it. Use when an archive decision
          turned out to be wrong.
        </p>
      </Step>

      <Step title="Muting users">
        <p>
          Mutes are time-boxed (pick a duration or &quot;perma&quot;) and
          issued from{" "}
          <Link href="/admin/users" className="text-accent hover:underline">
            /admin/users
          </Link>
          . A muted user keeps their vote power on existing content but
          cannot post new comments, file reports, favourite, or vote on tags.
          Mute is for someone whose behaviour is bad enough to warrant
          silencing but not bad enough to kick off the site entirely. Always
          include a mute reason — the user sees it on their profile.
        </p>
        <Callout>
          If you mute someone and they log back in on a new account to
          evade, that&apos;s the creator&apos;s problem to handle (hard ban).
          Flag the new account to the creator via a warning note or an
          out-of-band DM.
        </Callout>
      </Step>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CreatorSection() {
  return (
    <Section id="creator" title="Creator tools" tier="creator">
      <p className="text-foreground/70">
        You have everything in the lower tiers plus site-wide overrides.
        These actions are often irreversible — read each one twice.
      </p>

      <Step title="User role management">
        <p>
          <Link href="/admin/users" className="text-accent hover:underline">
            /admin/users
          </Link>{" "}
          groups users by role. Promote a trusted community member to{" "}
          <strong className="text-foreground">Moderator</strong> (triage +
          warnings) or{" "}
          <strong className="text-foreground">Elite Moderator</strong> (adds
          archive + mute). You cannot assign the creator role from the UI —
          it&apos;s owned by the{" "}
          <code className="rounded bg-black/40 px-1">CREATOR_STEAMID</code>{" "}
          env var. You also cannot modify your own role.
        </p>
      </Step>

      <Step title="Bans (temporary, permanent, hard)">
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            <strong className="text-foreground">Temporary ban</strong> — pick a
            duration in days. Ban ends on its own when the date elapses; the
            user regains full access automatically.
          </li>
          <li>
            <strong className="text-foreground">Permanent ban</strong> — sets the
            ban expiry to 9999-12-31. The user still has a session cookie
            but every write is blocked and they render as ghost in the UI.
          </li>
          <li>
            <strong className="text-foreground">Hard ban</strong> — the nuclear
            option. Blocks sign-in entirely at the Steam return handler.
            Existing sessions die immediately; the user can&apos;t log back
            in on the same SteamID. Use only for egregious abuse.
          </li>
          <li>
            <strong className="text-foreground">Clear warnings</strong> — wipes a
            user&apos;s warnings count and warning note. Useful when a user
            has reformed and you want the slate clean.
          </li>
          <li>
            <strong className="text-foreground">Allow young account / Revoke age bypass</strong>{" "}
            — toggle the 7-day Steam account-age gate for a specific user.
            Flip on for trusted community members whose Steam account is
            fresh. The gate stays on by default for everyone else; bypass is
            per-user, never global.
          </li>
        </ul>
      </Step>

      <Step title="Hard-deleting a creation">
        <p>
          From the creation detail page, Creator sees a permanent delete
          action. Sets status to{" "}
          <code className="rounded bg-black/40 px-1">deleted</code> — the
          item will never be re-ingested (deleted rows stay in the DB as a
          blocklist). Reports are wiped. Use when content is so bad that
          even archival history shouldn&apos;t hold it (DMCA, illegal,
          doxxing).
        </p>
      </Step>

      <Step title="Removing tags from a creation (creator bypass)">
        <p>
          On{" "}
          <code className="rounded bg-black/40 px-1">/creation/[id]</code>,
          any tag you can see shows an &quot;×&quot; remove button. This
          sets the tag&apos;s{" "}
          <code className="rounded bg-black/40 px-1">rejected=true</code>{" "}
          flag, which overrides all community votes and admin confirmations
          — the tag will never appear on that creation again. Creator-only
          so random mods can&apos;t undo community consensus on a whim.
        </p>
      </Step>

      <Step title="Managing the suggestions board">
        <p>
          <Link href="/admin/suggestions" className="text-accent hover:underline">
            /admin/suggestions
          </Link>{" "}
          has four buckets:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            <strong className="text-foreground">Inbox</strong> —{" "}
            <code className="rounded bg-black/40 px-1">submitted</code> ideas
            waiting for a decision. Approve (goes to the live board where
            people vote) or reject (killed with an optional reason that&apos;s
            shown to the submitter).
          </li>
          <li>
            <strong className="text-foreground">Live board</strong> — public,
            taking votes. Mark as{" "}
            <strong className="text-foreground">Implemented</strong> when you
            actually ship the feature (sends a notification to the
            submitter — a small dopamine hit that keeps people engaged).
          </li>
          <li>
            <strong className="text-foreground">Implemented</strong> / <strong className="text-foreground">Rejected</strong> — archival states. Anything can be
            reverted to{" "}
            <code className="rounded bg-black/40 px-1">approved</code> if you
            change your mind.
          </li>
        </ul>
        <p>
          Every card has a <strong className="text-foreground">Creator note</strong>{" "}
          field — inline editable, shown publicly on the live board. Use it
          to explain a rejection or a deferred decision.
        </p>
        <p>
          <strong className="text-foreground">Hard delete</strong> (🗑) permanently
          wipes a suggestion and its votes. No audit trail. Only use for
          spam, abuse, or duplicates.
        </p>
      </Step>

      <Step title="Escalation etiquette">
        <p>
          When a regular or elite mod asks you to handle a user-management
          action, always leave a warning-note breadcrumb on the affected user
          (even if you ban them) so the rest of the mod team knows what
          happened and why. Unlike Discord, there&apos;s no mod-log channel —
          warning notes are it.
        </p>
      </Step>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HouseRules() {
  return (
    <Section id="house-rules" title="House rules" tier="rules">
      <p className="text-foreground/70">
        A few principles that apply to every mod tier. Non-binding — use
        your judgement — but breaking them repeatedly is how a community
        loses trust in its mod team.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-foreground/70">
        <li>
          <strong className="text-foreground">Warn before you mute, mute before you ban.</strong>{" "}
          Every user deserves one chance to correct their behaviour before
          silencing, and a time-boxed silence before a full ban.
        </li>
        <li>
          <strong className="text-foreground">Leave a paper trail.</strong> Every
          mute, ban, and hard delete gets a note (mute reason, ban reason,
          warning note). Future-you and other mods will thank you.
        </li>
        <li>
          <strong className="text-foreground">Don&apos;t moderate content you have a stake in.</strong>{" "}
          If a comment is about your own submission, ask another mod to
          handle it. Conflict of interest is obvious even when you mean well.
        </li>
        <li>
          <strong className="text-foreground">Quick Approve when confident, full triage when unsure.</strong>{" "}
          The tag-queue backstop will catch mistakes; don&apos;t make the
          triage queue your bottleneck.
        </li>
        <li>
          <strong className="text-foreground">Hard ban is forever.</strong> Once
          set, the user cannot sign in again with that Steam account. Save
          it for abuse that would otherwise warrant a police report — slurs,
          targeted harassment, sexual content involving minors, etc.
        </li>
      </ul>
    </Section>
  );
}
