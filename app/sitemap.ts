import type { MetadataRoute } from "next";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";

const KIND_SLUGS = [
  "blueprints",
  "mods",
  "worlds",
  "challenges",
  "tiles",
  "custom-games",
  "terrain",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/new`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...KIND_SLUGS.map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  let creationEntries: MetadataRoute.Sitemap = [];
  let authorEntries: MetadataRoute.Sitemap = [];
  try {
    const db = getDb();
    const rows = await db
      .select({ shortId: creations.shortId, approvedAt: creations.approvedAt })
      .from(creations)
      .where(eq(creations.status, "approved"))
      .orderBy(desc(creations.approvedAt))
      .limit(5000);
    creationEntries = rows.map((r) => ({
      url: `${base}/creation/${r.shortId}`,
      lastModified: r.approvedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const authorRows = await db
      .select({ steamid: creations.authorSteamid, latest: sql<Date>`max(${creations.approvedAt})` })
      .from(creations)
      .where(
        and(eq(creations.status, "approved"), isNotNull(creations.authorSteamid)),
      )
      .groupBy(creations.authorSteamid);
    authorEntries = authorRows
      .filter((r) => r.steamid)
      .map((r) => ({
        url: `${base}/author/${r.steamid}`,
        lastModified: r.latest ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }));
  } catch {
    // DB not ready (e.g. during first build before migrations). Skip.
  }

  return [...staticEntries, ...creationEntries, ...authorEntries];
}
