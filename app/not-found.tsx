import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">
        {t("notFound.eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-foreground/60">{t("notFound.body")}</p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black"
        >
          {t("notFound.home")}
        </Link>
        <Link
          href="/search"
          className="inline-block rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
        >
          {t("notFound.search")}
        </Link>
      </div>
    </div>
  );
}
