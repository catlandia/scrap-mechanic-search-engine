import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What we collect, why, and how long we keep it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-white/80">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Privacy</h1>
        <p className="text-white/50">Last updated April 2026.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">The short version</h2>
        <p>
          This is a community-run, non-commercial directory of Scrap Mechanic
          Workshop creations. We don&apos;t sell data, we don&apos;t run ads, we
          don&apos;t have an analytics tracker following you around. If you never
          sign in, we never see who you are.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What we store</h2>
        <p>If you sign in with Steam, we save:</p>
        <ul className="list-disc space-y-1 pl-6 text-white/70">
          <li>Your public SteamID, persona name, and avatar URL.</li>
          <li>
            Your Steam account age and Scrap Mechanic playtime — these come from
            Steam and are used to filter brand-new throwaway accounts.
          </li>
          <li>
            The times you signed in, commented, voted, favourited, or submitted
            an item — so moderators can keep the site readable.
          </li>
        </ul>
        <p>
          We <strong>do not</strong> collect your email, password, phone number,
          real name, IP address, or browsing history.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Cookies</h2>
        <ul className="list-disc space-y-1 pl-6 text-white/70">
          <li>
            <code className="text-white">smse_session</code> — signed-in session,
            expires after a week of inactivity.
          </li>
          <li>
            <code className="text-white">smse_captcha</code> — short-lived
            (30&nbsp;min) state for the anti-bot challenge.
          </li>
          <li>
            <code className="text-white">bot_verified</code> — set after you
            pass the challenge, lasts 30 days.
          </li>
          <li>
            <code className="text-white">rating_mode</code> — remembers whether
            you prefer Steam ratings, site ratings, or both.
          </li>
        </ul>
        <p>
          All cookies are first-party, HTTP-only, and signed with a server
          secret. No advertising trackers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Where the data lives</h2>
        <ul className="list-disc space-y-1 pl-6 text-white/70">
          <li>Database: Neon (serverless Postgres, free tier).</li>
          <li>Hosting: Vercel.</li>
          <li>Workshop metadata &amp; thumbnails: Steam (hotlinked).</li>
        </ul>
        <p>
          Vercel and Neon may keep ephemeral operational logs. We don&apos;t put
          personal data in log messages beyond what&apos;s needed to fix bugs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Your controls</h2>
        <ul className="list-disc space-y-1 pl-6 text-white/70">
          <li>
            Stop using the site any time — logged-out visitors leave no
            identifying data.
          </li>
          <li>
            Ask for deletion of your account data by opening an issue on the
            project&apos;s{" "}
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              GitHub
            </a>
            . Content you posted (comments, suggestions) may be anonymised
            rather than deleted to keep discussion threads readable.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Changes</h2>
        <p>
          If this policy meaningfully changes, the update will be announced in
          the site&apos;s release notes. This page will always show the latest
          version.
        </p>
      </section>
    </article>
  );
}
