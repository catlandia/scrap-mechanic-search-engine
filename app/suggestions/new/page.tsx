import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { SuggestionForm } from "@/components/SuggestionForm";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a suggestion — Scrap Mechanic Search Engine",
  description:
    "Submit a private feature suggestion to the Scrap Mechanic Search Engine. Approved ideas land on the public board where the community upvotes them.",
  robots: { index: false, follow: false },
};

export default async function NewSuggestionPage() {
  const user = await getCurrentUser();
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/suggestions"
          className="text-sm text-foreground/60 hover:text-accent"
        >
          {t("suggestions.new.back")}
        </Link>
        <h1 className="text-3xl font-bold">{t("suggestions.new.title")}</h1>
        <p className="text-sm text-foreground/60">{t("suggestions.new.subtitle")}</p>
      </header>

      {!user ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm">
          <div className="text-foreground/80">{t("suggestions.new.signInPrompt")}</div>
          <Link
            href="/auth/steam/login?next=/suggestions/new"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            {t("nav.signIn")}
          </Link>
        </div>
      ) : isBanned(user) ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t("suggestions.new.banned")}
        </div>
      ) : isMuted(user) ? (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          {t("suggestions.new.muted")}
        </div>
      ) : (
        <SuggestionForm />
      )}
    </div>
  );
}
