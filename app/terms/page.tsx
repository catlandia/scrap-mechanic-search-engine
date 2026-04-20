import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Rules for using the site and posting content.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-foreground/80">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Terms of use</h1>
        <p className="text-foreground/50">Last updated April 2026.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">What this site is</h2>
        <p>
          Scrap Mechanic Search Engine is a free, community-run directory that
          links to Steam Workshop creations for the game Scrap Mechanic. We are
          not affiliated with Axolot Games or Valve. Workshop items themselves
          are hosted on Steam; we only store metadata (title, description,
          tags, thumbnail URL) and link back.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <p>
          Signing in uses Steam OpenID — we never see your Steam password. By
          signing in you agree to these terms and to our{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            privacy policy
          </Link>
          . You are responsible for keeping your Steam account secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Community rules</h2>
        <p>When posting comments, tags, suggestions, or submissions:</p>
        <ul className="list-disc space-y-1 pl-6 text-foreground/70">
          <li>Be decent. No harassment, slurs, or threats.</li>
          <li>No spam, ads, or off-topic content.</li>
          <li>
            Only submit Workshop items for Scrap Mechanic (appid&nbsp;387990).
            Submissions for other games are rejected automatically.
          </li>
          <li>
            Don&apos;t post someone else&apos;s personal information.
          </li>
          <li>Don&apos;t try to break, brute-force, or exploit the site.</li>
        </ul>
        <p>
          Moderators can hide content, warn, mute, or ban accounts that break
          these rules. Severe or repeated abuse may result in a permanent ban.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Your content</h2>
        <p>
          Comments and suggestions you post stay credited to your persona name
          and may be kept in threaded form even after you leave, so ongoing
          discussions still make sense. You retain ownership of anything you
          write; by posting it you grant the site a non-exclusive right to
          display it to other users.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Workshop content and takedowns
        </h2>
        <p>
          The actual files and images for each Workshop item are hosted by
          Steam. If your Workshop item is listed here and you want it removed
          (e.g., you unpublished it on Steam), open an issue on the
          project&apos;s{" "}
          <a
            href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            GitHub repository
          </a>{" "}
          or contact a moderator and we&apos;ll take it down.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">No warranty</h2>
        <p>
          The site is provided as-is. Features can change or disappear, the
          site can go down, data can be wrong. Don&apos;t rely on it for
          anything important.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Changes</h2>
        <p>
          We may update these terms. Material changes will be noted in the
          release notes. Continued use after a change means you accept the
          updated version.
        </p>
      </section>
    </article>
  );
}
