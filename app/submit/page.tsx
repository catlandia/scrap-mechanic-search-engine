import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { SubmitCreationForm } from "@/components/SubmitCreationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a creation — Scrap Mechanic Search Engine",
  description:
    "Submit a Scrap Mechanic Steam Workshop creation the cron hasn't found yet. Approved items appear on the public feed with a Community badge crediting you.",
  robots: { index: false, follow: false },
};

export default async function SubmitPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">
          Submit a creation
        </p>
        <h1 className="text-3xl font-bold">Suggest a Workshop item</h1>
        <p className="text-sm text-foreground/60">
          Got a gem the cron hasn&apos;t found yet? Submit any Steam Workshop
          URL or id — a moderator will review it and it&apos;ll land on the
          public feed with a{" "}
          <span className="rounded bg-purple-500/30 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200">
            Community
          </span>{" "}
          badge crediting you.
        </p>
      </header>

      {!user ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm">
          <div className="text-foreground/80">
            You need to be signed in to submit.
          </div>
          <Link
            href="/auth/steam/login?next=/submit"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Sign in with Steam
          </Link>
        </div>
      ) : isBanned(user) ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Your account is currently banned — submissions are disabled.
        </div>
      ) : isMuted(user) ? (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-5 py-4 text-sm text-sky-200">
          You&apos;re currently muted — submissions are disabled.
        </div>
      ) : (
        <SubmitCreationForm />
      )}

      <div className="rounded-md border border-border bg-card/40 p-4 text-xs text-foreground/60">
        <div className="font-medium text-foreground/70">Accepted forms</div>
        <ul className="mt-2 space-y-1 font-mono">
          <li>https://steamcommunity.com/sharedfiles/filedetails/?id=3706129300</li>
          <li>https://steamcommunity.com/workshop/filedetails/?id=3706129300</li>
          <li>3706129300</li>
        </ul>
        <p className="mt-3 text-foreground/50">
          Submitted items go into the mod triage queue. They appear publicly
          once approved; the cron won&apos;t also try to re-ingest them.
        </p>
      </div>
    </div>
  );
}
