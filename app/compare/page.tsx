import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getCreationDetail } from "@/lib/db/queries";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ids?: string }>;

const MAX_ITEMS = 4;

const KIND_KEY: Record<string, string> = {
  blueprint: "kind.blueprint",
  mod: "kind.mod",
  world: "kind.world",
  challenge: "kind.challenge",
  tile: "kind.tile",
  custom_game: "kind.customGame",
  terrain_asset: "kind.terrainAsset",
  other: "kind.other",
};

export const metadata: Metadata = {
  title: "Compare creations",
  robots: { index: false, follow: false },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { t } = await getT();

  const raw = sp.ids?.trim() ?? "";
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  // Load each creation in parallel; getCreationDetail accepts either short_id
  // or the publishedfileid string, so the UI's basket can store either.
  const detailsRaw = await Promise.all(requested.map((id) => getCreationDetail(id)));
  const details = detailsRaw.flatMap((d) =>
    d && d.creation.status === "approved" ? [d] : [],
  );

  if (details.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card/60 px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">{t("compare.heading")}</h1>
        <p className="text-sm text-foreground/70">{t("compare.emptyHelp")}</p>
        <Link
          href="/search"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          {t("compare.browseLink")}
        </Link>
      </div>
    );
  }

  if (details.length === 1) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card/60 px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">{t("compare.heading")}</h1>
        <p className="text-sm text-foreground/70">{t("compare.needTwo")}</p>
        <Link
          href={`/creation/${details[0].creation.shortId ?? details[0].creation.id}`}
          className="text-accent hover:underline"
        >
          ← {details[0].creation.title}
        </Link>
      </div>
    );
  }

  // Build a flat row-per-stat structure so the table is easy to skim
  // top-to-bottom by attribute. Each cell renders the value for that
  // creation, falling back to "—" when unknown.
  const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString();
  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-widest text-accent">
          {t("compare.heading")}
        </p>
        <h1 className="text-3xl font-bold">
          {t("compare.subheading", { count: String(details.length) })}
        </h1>
      </header>

      <div className="overflow-x-auto rounded-md border border-border bg-card/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-32 bg-card/80 px-3 py-3 text-left text-[10px] uppercase tracking-widest text-foreground/40">
                {t("compare.field")}
              </th>
              {details.map((d) => (
                <th
                  key={d.creation.id}
                  className="border-l border-border px-3 py-3 text-left align-top"
                >
                  <Link
                    href={`/creation/${d.creation.shortId ?? d.creation.id}`}
                    className="block space-y-2"
                  >
                    {d.creation.thumbnailUrl ? (
                      <Image
                        src={d.creation.thumbnailUrl}
                        alt=""
                        width={240}
                        height={135}
                        unoptimized
                        className="aspect-video w-full rounded-sm border border-foreground/10 object-cover"
                      />
                    ) : (
                      <div className="aspect-video w-full rounded-sm bg-foreground/5" />
                    )}
                    <div className="line-clamp-2 font-semibold text-foreground hover:text-accent">
                      {d.creation.title}
                    </div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label={t("compare.fieldKind")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  {KIND_KEY[d.creation.kind] ? t(KIND_KEY[d.creation.kind]) : d.creation.kind}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldAuthor")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  {d.creation.authorSteamid ? (
                    <Link
                      href={`/author/${d.creation.authorSteamid}`}
                      className="text-accent hover:underline"
                    >
                      {d.creation.authorName ?? "—"}
                    </Link>
                  ) : (
                    (d.creation.authorName ?? "—")
                  )}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldSubs")}>
              {details.map((d) => (
                <Cell key={d.creation.id} mono>
                  {fmtNum(d.creation.subscriptions)}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldFavorites")}>
              {details.map((d) => (
                <Cell key={d.creation.id} mono>
                  {fmtNum(d.creation.favorites)}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldRating")}>
              {details.map((d) => (
                <Cell key={d.creation.id} mono>
                  {d.creation.voteScore == null
                    ? "—"
                    : `${(d.creation.voteScore * 100).toFixed(0)}%`}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldSiteNet")}>
              {details.map((d) => {
                const net =
                  (d.creation.siteWeightedUp ?? 0) -
                  (d.creation.siteWeightedDown ?? 0);
                return (
                  <Cell key={d.creation.id} mono>
                    {net > 0 ? `+${net}` : net.toString()}
                  </Cell>
                );
              })}
            </Row>
            <Row label={t("compare.fieldOnSteam")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  {fmtDate(d.creation.timeCreated)}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldOnSite")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  {fmtDate(d.creation.approvedAt)}
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldTags")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  <div className="flex flex-wrap gap-1">
                    {d.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-foreground/15 bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/70"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {d.tags.length === 0 && (
                      <span className="text-foreground/40">—</span>
                    )}
                  </div>
                </Cell>
              ))}
            </Row>
            <Row label={t("compare.fieldLinks")}>
              {details.map((d) => (
                <Cell key={d.creation.id}>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={d.creation.steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      Steam ↗
                    </a>
                    <Link
                      href={`/creation/${d.creation.shortId ?? d.creation.id}`}
                      className="text-accent hover:underline"
                    >
                      {t("compare.openOnSite")}
                    </Link>
                  </div>
                </Cell>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-border">
      <th className="bg-card/80 px-3 py-2 text-left align-top text-[11px] uppercase tracking-widest text-foreground/50">
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={`border-l border-border px-3 py-2 align-top ${
        mono ? "font-mono text-xs" : ""
      }`}
    >
      {children}
    </td>
  );
}
