import { getNewestApproved } from "@/lib/db/queries";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// DB kind value → translation key for the singular form used in RSS
// category + description lines. Kept as a map rather than dynamic key
// interpolation so a typo in a kind slug is a compile error rather
// than a silently-untranslated category.
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scrap-mechanic-search-engine.vercel.app";
  const [rows, { t, locale }] = await Promise.all([
    getNewestApproved(50, 0),
    getT(),
  ]);
  const now = new Date().toUTCString();

  const items = rows
    .map((r) => {
      const link = `${site}/creation/${r.shortId ?? r.id}`;
      const kind = KIND_KEY[r.kind] ? t(KIND_KEY[r.kind]) : t("kind.creationFallback");
      const author = r.authorName ? ` ${t("rss.by")} ${r.authorName}` : "";
      const pubDate = r.approvedAt ? new Date(r.approvedAt).toUTCString() : now;
      const description = `${kind}${author}`;
      return `    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(kind)}</category>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(t("rss.title"))}</title>
    <link>${site}</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(t("rss.description"))}</description>
    <language>${locale}</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
