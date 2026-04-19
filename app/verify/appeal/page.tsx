import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { AppealForm } from "./AppealForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appeal the age gate",
  description:
    "Ask a moderator to let you through the Steam account age gate.",
  robots: { index: false, follow: false },
};

export default async function AppealPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <article className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Appeal the age gate</h1>
        <p className="text-sm text-foreground/70">
          You need to sign in with Steam first so moderators know which
          account to approve.
        </p>
        <Link
          href="/auth/steam/login?next=/verify/appeal"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Sign in with Steam
        </Link>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Appeal the age gate</h1>
        <p className="text-sm text-foreground/70">
          By default, posting, voting, and submitting require a Steam account
          at least 7 days old. If your Steam profile is private, your account
          age is hidden and we can&apos;t verify it — so the gate blocks you
          fail-closed.
        </p>
        <p className="text-sm text-foreground/70">
          This form is the way around it. Tell a moderator who you are and
          they&apos;ll flip the gate on your account manually. One appeal per
          24 hours is enough.
        </p>
      </header>

      <section className="rounded-md border border-border bg-card/60 px-4 py-3 text-xs text-foreground/60">
        <div className="mb-1 font-medium text-foreground/80">Signed in as</div>
        <div>{user.personaName}</div>
        <div className="font-mono text-[10px] text-foreground/40">
          {user.steamid}
        </div>
      </section>

      <AppealForm />

      <p className="text-xs text-foreground/50">
        Alternative: if you&apos;re comfortable doing so, make your Steam
        profile public (Profile → Edit Profile → Privacy Settings → My
        profile: Public). The age gate will then lift automatically on your
        next sign-in.
      </p>
    </article>
  );
}
