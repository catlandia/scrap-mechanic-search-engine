import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { AppealForm } from "./AppealForm";

export const dynamic = "force-dynamic";

const MIN_STEAM_AGE_DAYS = 7;

export const metadata: Metadata = {
  title: "Appeal the age gate",
  description:
    "Ask a moderator to let you through the Steam account age gate.",
  robots: { index: false, follow: false },
};

type GateState =
  | { kind: "signed_out" }
  | { kind: "hard_banned" }
  | { kind: "already_bypassed" }
  | { kind: "age_verified" }
  | { kind: "too_young"; through: Date }
  | { kind: "private_profile" };

export default async function AppealPage() {
  const user = await getCurrentUser();

  const state: GateState = (() => {
    if (!user) return { kind: "signed_out" };
    if (user.hardBanned) return { kind: "hard_banned" };
    if (user.bypassAgeGate) return { kind: "already_bypassed" };
    if (user.steamCreatedAt) {
      const ageDays =
        (Date.now() - user.steamCreatedAt.getTime()) / 86_400_000;
      if (ageDays >= MIN_STEAM_AGE_DAYS) return { kind: "age_verified" };
      const through = new Date(
        user.steamCreatedAt.getTime() + MIN_STEAM_AGE_DAYS * 86_400_000,
      );
      return { kind: "too_young", through };
    }
    return { kind: "private_profile" };
  })();

  return (
    <article className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Appeal the age gate</h1>
        <p className="text-sm text-foreground/70">
          By default, posting, voting, and submitting require a Steam account
          at least 7 days old. This appeal path is for one specific case:
          when your <strong>Steam profile is private</strong> and we can&apos;t
          read the account-age field at all.
        </p>
      </header>

      {state.kind === "signed_out" && (
        <div className="rounded-md border border-border bg-card/60 px-4 py-4 text-sm">
          <p className="text-foreground/70">
            You need to sign in with Steam first so moderators know which
            account to approve.
          </p>
          <Link
            href="/auth/steam/login?next=/verify/appeal"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Sign in with Steam
          </Link>
        </div>
      )}

      {state.kind === "hard_banned" && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm text-red-200">
          Your account is blocked from this site. There&apos;s no appeal
          path from here.
        </div>
      )}

      {state.kind === "already_bypassed" && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
          A moderator has already flipped the age gate on your account. You
          should be able to submit, comment, and vote — nothing to appeal.
        </div>
      )}

      {state.kind === "age_verified" && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm">
          <div className="font-semibold text-emerald-200">
            Your Steam account is already past the 7-day check.
          </div>
          <p className="mt-2 text-emerald-100/80">
            Signing out and back in usually clears any stale cache. If
            you&apos;re still blocked after that, please open a{" "}
            <a
              href="https://github.com/catlandia/scrap-mechanic-search-engine/issues"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              GitHub issue
            </a>{" "}
            describing which action you&apos;re trying to take.
          </p>
        </div>
      )}

      {state.kind === "too_young" && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm">
          <div className="font-semibold text-amber-200">
            Your Steam account is less than 7 days old.
          </div>
          <p className="mt-2 text-foreground/70">
            The 7-day rule exists to stop fresh sock-puppet accounts from
            spamming the site, and this appeal path <strong>isn&apos;t a
            bypass for that</strong> — it only exists for people whose
            profile is private and whose age we can&apos;t read at all.
          </p>
          <p className="mt-2 text-foreground/70">
            Your account will clear the gate automatically on{" "}
            <strong className="text-amber-200">
              {state.through.toLocaleDateString()}
            </strong>
            . Come back then.
          </p>
        </div>
      )}

      {state.kind === "private_profile" && (
        <>
          <section className="rounded-md border border-border bg-card/60 px-4 py-3 text-xs text-foreground/60">
            <div className="mb-1 font-medium text-foreground/80">
              Signed in as
            </div>
            <div>{user!.personaName}</div>
            <div className="font-mono text-[10px] text-foreground/40">
              {user!.steamid}
            </div>
          </section>

          <p className="text-sm text-foreground/70">
            Your Steam profile is private, so we can&apos;t tell how old your
            account is. Send a moderator a short message explaining who you
            are and they&apos;ll flip the gate on your account manually.
            One appeal per 24 hours is enough.
          </p>

          <AppealForm />

          <p className="text-xs text-foreground/50">
            Easier alternative: if you&apos;re comfortable, make your Steam
            profile public (Profile → Edit Profile → Privacy Settings → My
            profile: Public). The gate will lift automatically on your next
            sign-in — no moderator involvement needed.
          </p>
        </>
      )}
    </article>
  );
}
