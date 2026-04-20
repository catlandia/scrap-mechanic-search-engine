import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, creationTags, creations, tags } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tags/search?q=hou&limit=10
 * Returns tags whose name or slug ILIKE the query, ordered by how many
 * approved creations currently use them (desc). Popularity is the tie-
 * breaker the user asked for — when they type "B" they see Boat / Bomb
 * / Building ranked by current usage.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 25)
    : 10;

  const db = getDb();

  const matched = await db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      categoryId: tags.categoryId,
      categoryName: categories.name,
    })
    .from(tags)
    .leftJoin(categories, eq(categories.id, tags.categoryId))
    .where(
      q
        ? sql`(${tags.name} ILIKE ${`%${q}%`} OR ${tags.slug} ILIKE ${`%${q}%`})`
        : sql`true`,
    )
    .orderBy(asc(tags.name))
    .limit(limit * 3);

  if (matched.length === 0) {
    return NextResponse.json({ tags: [] });
  }

  const ids = matched.map((t) => t.id);
  const usageRows = await db
    .select({
      tagId: creationTags.tagId,
      count: sql<number>`count(*)::int`,
    })
    .from(creationTags)
    .innerJoin(creations, eq(creations.id, creationTags.creationId))
    .where(
      and(
        inArray(creationTags.tagId, ids),
        eq(creationTags.rejected, false),
        eq(creations.status, "approved"),
      ),
    )
    .groupBy(creationTags.tagId);
  const usageByTag = new Map(usageRows.map((r) => [r.tagId, r.count]));

  const out = matched.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    categoryId: t.categoryId,
    categoryName: t.categoryName ?? null,
    usage: usageByTag.get(t.id) ?? 0,
  }));

  out.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
  return NextResponse.json({ tags: out.slice(0, limit) });
}
