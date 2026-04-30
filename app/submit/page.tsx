import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isBanned, isMuted } from "@/lib/auth/session";
import { SubmitCreationForm } from "@/components/SubmitCreationForm";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("submit.metadataTitle"),
    description: t("submit.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

const MIN_STEAM_AGE_DAYS = 7;

type GateReason = "ok" | "private_profile" | "too_young";

function ageGateReason(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
): GateReason {
  if (user.bypassAgeGate) return "ok";
  if (!user.steamCreatedAt) return "private_profile";
  const ageDays =
    (Date.now() - user.steamCreatedAt.getTime()) / 86_400_000;
  return ageDays < MIN_STEAM_AGE_DAYS ? "too_young" : "ok";
}

type SearchParams = Promise<{ steam?: string }>;

export default async function SubmitPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await getCurrentUser();
  const { t } = await getT();
  const sp = searchParams ? await searchParams : undefined;
  // Prefill the URL field when the visitor came in from the browser
  // extension (or any external link with `?steam=…`). Accept either a raw
  // publishedfileid or a full Steam URL — `submitCreation` parses both.
  const rawSteam = sp?.steam?.trim() ?? "";
  const prefill = /^\d{1,25}$/.test(rawSteam)
    ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${rawSteam}`
    : rawSteam.startsWith("http")
      ? rawSteam
      : "";
  const gateReason = user ? ageGateReason(user) : "ok";
  const ageThrough =
    user?.steamCreatedAt
      ? new Date(
          user.steamCreatedAt.getTime() + MIN_STEAM_AGE_DAYS * 86_400_000,
        )
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-accent">
          {t("submit.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("submit.title")}</h1>
        <p className="text-sm text-foreground/60">
          {t("submit.introBefore")}{" "}
          <span className="rounded bg-purple-500/30 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200">
            {t("submit.introCommunityBadge")}
          </span>{" "}
          {t("submit.introAfter")}
        </p>
        <p className="text-xs text-foreground/50">{t("submit.tagsEnglishDisclaimer")}</p>
      </header>

      {!user ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-4 text-sm">
          <div className="text-foreground/80">{t("submit.signedOut")}</div>
          {/* Plain <a>: server redirects to steamcommunity.com; <Link> prefetch would CORS-fail. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/auth/steam/login?next=/submit"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            {t("nav.signIn")}
          </a>
        </div>
      ) : isBanned(user) ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {t("submit.banned")}
        </div>
      ) : isMuted(user) ? (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-5 py-4 text-sm text-sky-200">
          {t("submit.muted")}
        </div>
      ) : gateReason === "private_profile" ? (
        <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
          <div className="font-semibold text-amber-200">
            {t("submit.privateProfileTitle")}
          </div>
          <p className="text-foreground/70">
            {t("submit.privateProfileBody")}
          </p>
          <Link
            href="/verify/appeal"
            className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            {t("submit.privateProfileAppeal")}
          </Link>
        </div>
      ) : gateReason === "too_young" ? (
        <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
          <div className="font-semibold text-amber-200">
            {t("submit.tooYoungTitle")}
          </div>
          <p className="text-foreground/70">{t("submit.tooYoungBody")}</p>
          {ageThrough && (
            <p className="text-foreground/70">
              {t("submit.tooYoungClearsOn", {
                date: ageThrough.toLocaleDateString(),
              })}
            </p>
          )}
        </div>
      ) : (
        <SubmitCreationForm prefill={prefill} />
      )}

      <div className="rounded-md border border-border bg-card/40 p-4 text-xs text-foreground/60">
        <div className="font-medium text-foreground/70">
          {t("submit.acceptedForms")}
        </div>
        <ul className="mt-2 space-y-1 font-mono">
          <li>https://steamcommunity.com/sharedfiles/filedetails/?id=3706129300</li>
          <li>https://steamcommunity.com/workshop/filedetails/?id=3706129300</li>
          <li>3706129300</li>
        </ul>
        <p className="mt-3 text-foreground/50">{t("submit.queueExplain")}</p>
        <p className="mt-2 text-foreground/50">
          {t("submit.curious")}{" "}
          <Link href="/about" className="text-accent hover:underline">
            {t("submit.howItWorks")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
