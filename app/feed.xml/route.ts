import { getNewestApproved } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain",
  other: "Other",
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
  const rows = await getNewestApproved(50, 0);
  const now = new Date().toUTCString();

  const items = rows
    .map((r) => {
      const link = `${site}/creation/${r.shortId ?? r.id}`;
      const kind = KIND_LABEL[r.kind] ?? "Creation";
      const author = r.authorName ? ` by ${r.authorName}` : "";
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
    <title>Scrap Mechanic Search Engine — Newest</title>
    <link>${site}</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Newest approved Scrap Mechanic Steam Workshop creations on the Scrap Mechanic Search Engine.</description>
    <language>en</language>
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
