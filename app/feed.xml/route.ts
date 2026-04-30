import {
  getAuthorCreations,
  getAuthorProfile,
  getNewestApproved,
  searchApproved,
  type CreationCardRow,
} from "@/lib/db/queries";
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

export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scrap-mechanic-search-engine.vercel.app";
  const url = new URL(req.url);
  const authorParam = url.searchParams.get("author")?.trim() ?? null;
  const tagParam = url.searchParams.get("tag")?.trim() ?? null;

  const { t, locale } = await getT();

  let rows: CreationCardRow[];
  let feedTitle = t("rss.title");
  let feedDescription = t("rss.description");
  let selfPath = "/feed.xml";

  if (authorParam && /^\d{1,25}$/.test(authorParam)) {
    // Per-author feed: validate the steamid is at least credited on
    // something so we don't serve an empty channel for arbitrary input.
    const profile = await getAuthorProfile(authorParam);
    if (profile) {
      rows = await getAuthorCreations(authorParam, {
        sort: "newest",
        limit: 50,
      });
      const name = profile.authorName ?? "Unknown author";
      feedTitle = `${t("rss.titleByAuthor", { name })}`;
      feedDescription = t("rss.descriptionByAuthor", { name });
      selfPath = `/feed.xml?author=${authorParam}`;
    } else {
      rows = [];
    }
  } else if (tagParam && /^[a-z0-9-]{1,40}$/.test(tagParam)) {
    // Per-tag feed: reuse the search query helper with a single tag slug
    // and the newest sort so the feed surfaces fresh items, not popular
    // ones (which is what RSS subscribers actually want).
    const result = await searchApproved(
      { tagSlugs: [tagParam], sort: "newest" },
      0,
      50,
    );
    rows = result.items;
    feedTitle = t("rss.titleByTag", { tag: tagParam });
    feedDescription = t("rss.descriptionByTag", { tag: tagParam });
    selfPath = `/feed.xml?tag=${tagParam}`;
  } else {
    rows = await getNewestApproved(50, 0);
  }
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
    <title>${escapeXml(feedTitle)}</title>
    <link>${site}</link>
    <atom:link href="${site}${selfPath}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(feedDescription)}</description>
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
