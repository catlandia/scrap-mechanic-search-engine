import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "./client";
import {
  categories,
  creationCategories,
  creationTags,
  creations,
  tags,
  type CreationKind,
} from "./schema";

export interface CreationCardRow {
  id: string;
  shortId: number;
  title: string;
  thumbnailUrl: string | null;
  steamUrl: string;
  kind: string;
  authorName: string | null;
  authorSteamid: string | null;
  subscriptions: number;
  favorites: number;
  voteScore: number | null;
  votesUp: number | null;
  votesDown: number | null;
  approvedAt: Date | null;
}

const cardColumns = {
  id: creations.id,
  shortId: creations.shortId,
  title: creations.title,
  thumbnailUrl: creations.thumbnailUrl,
  steamUrl: creations.steamUrl,
  kind: creations.kind,
  authorName: creations.authorName,
  authorSteamid: creations.authorSteamid,
  subscriptions: creations.subscriptions,
  favorites: creations.favorites,
  voteScore: creations.voteScore,
  votesUp: creations.votesUp,
  votesDown: creations.votesDown,
  approvedAt: creations.approvedAt,
};

export const SORT_MODES = [
  "newest",
  "oldest",
  "steam-newest",
  "steam-oldest",
  "popular",
  "unpopular",
  "favorites",
  "least-favorites",
  "rating",
  "least-rating",
] as const;
export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Record<SortMode, string> = {
  newest: "Newest on site",
  oldest: "Oldest on site",
  "steam-newest": "Newest on Steam",
  "steam-oldest": "Oldest on Steam",
  popular: "Most subscribers",
  unpopular: "Fewest subscribers",
  favorites: "Most favourites",
  "least-favorites": "Fewest favourites",
  rating: "Highest rated",
  "least-rating": "Lowest rated",
};

export function parseSortMode(raw: string | undefined | null): SortMode {
  if (raw && (SORT_MODES as readonly string[]).includes(raw)) return raw as SortMode;
  return "newest";
}

function orderByForSort(sort: SortMode): SQL {
  switch (sort) {
    case "newest":
      return sql`${creations.approvedAt} DESC NULLS LAST`;
    case "oldest":
      return sql`${creations.approvedAt} ASC NULLS LAST`;
    case "steam-newest":
      return sql`${creations.timeCreated} DESC NULLS LAST`;
    case "steam-oldest":
      return sql`${creations.timeCreated} ASC NULLS LAST`;
    case "popular":
      return sql`${creations.subscriptions} DESC`;
    case "unpopular":
      return sql`${creations.subscriptions} ASC`;
    case "favorites":
      return sql`${creations.favorites} DESC`;
    case "least-favorites":
      return sql`${creations.favorites} ASC`;
    case "rating":
      return sql`${creations.voteScore} DESC NULLS LAST`;
    case "least-rating":
      return sql`${creations.voteScore} ASC NULLS LAST`;
  }
}

export async function getNewestApproved(
  limit = 24,
  offset = 0,
): Promise<CreationCardRow[]> {
  const db = getDb();
  return db
    .select(cardColumns)
    .from(creations)
    .where(eq(creations.status, "approved"))
    .orderBy(desc(creations.approvedAt))
    .limit(limit)
    .offset(offset);
}

export async function getApprovedByKind(
  kind: CreationKind,
  opts: { sort?: SortMode; limit?: number; offset?: number } = {},
): Promise<CreationCardRow[]> {
  const db = getDb();
  const { sort = "newest", limit = 24, offset = 0 } = opts;
  return db
    .select(cardColumns)
    .from(creations)
    .where(and(eq(creations.status, "approved"), eq(creations.kind, kind)))
    .orderBy(orderByForSort(sort))
    .limit(limit)
    .offset(offset);
}

export interface SearchFilters {
  kind?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  q?: string;
  sort?: SortMode;
}

async function tagIdsForSlugs(slugs: string[]): Promise<number[]> {
  if (slugs.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.slug, slugs));
  return rows.map((r) => r.id);
}

async function categoryIdForSlug(slug: string): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

export interface SearchPage {
  items: CreationCardRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchApproved(
  filters: SearchFilters,
  page = 0,
  pageSize = 24,
): Promise<SearchPage> {
  const db = getDb();
  const where: SQL[] = [eq(creations.status, "approved")];

  if (filters.kind) {
    where.push(eq(creations.kind, filters.kind));
  }

  if (filters.tagSlugs && filters.tagSlugs.length > 0) {
    const tagIds = await tagIdsForSlugs(filters.tagSlugs);
    if (tagIds.length !== filters.tagSlugs.length) {
      return { items: [], total: 0, page, pageSize };
    }
    const rows = await db
      .select({ id: creationTags.creationId })
      .from(creationTags)
      .where(inArray(creationTags.tagId, tagIds))
      .groupBy(creationTags.creationId)
      .having(
        sql`COUNT(DISTINCT ${creationTags.tagId}) = ${tagIds.length}`,
      );
    if (rows.length === 0) return { items: [], total: 0, page, pageSize };
    where.push(inArray(creations.id, rows.map((r) => r.id)));
  }

  if (filters.categorySlug) {
    const categoryId = await categoryIdForSlug(filters.categorySlug);
    if (!categoryId) return { items: [], total: 0, page, pageSize };
    const rows = await db
      .select({ id: creationCategories.creationId })
      .from(creationCategories)
      .where(eq(creationCategories.categoryId, categoryId));
    if (rows.length === 0) return { items: [], total: 0, page, pageSize };
    where.push(inArray(creations.id, rows.map((r) => r.id)));
  }

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    const cond = or(
      ilike(creations.title, term),
      ilike(creations.descriptionClean, term),
    );
    if (cond) where.push(cond);
  }

  const condition = where.length === 1 ? where[0] : and(...where);
  const orderBy = orderByForSort(filters.sort ?? "newest");

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(creations)
    .where(condition);

  const items = await db
    .select(cardColumns)
    .from(creations)
    .where(condition)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(page * pageSize);

  return { items, total: countRow?.n ?? 0, page, pageSize };
}

export interface CreationDetail {
  creation: typeof creations.$inferSelect;
  tags: { id: number; slug: string; name: string }[];
  categories: { id: number; slug: string; name: string }[];
}

/**
 * Accepts either a short_id (integer, used in user-facing URLs) or a Steam
 * publishedfileid (numeric string). Short IDs stay under 500M; modern Scrap
 * Mechanic publishedfileids are already 3.7B+, so the ranges never collide.
 */
export async function getCreationDetail(input: string): Promise<CreationDetail | null> {
  const db = getDb();
  let creation: typeof creations.$inferSelect | undefined;

  const asInt = Number(input);
  if (Number.isInteger(asInt) && asInt > 0 && asInt < 500_000_000) {
    const rows = await db
      .select()
      .from(creations)
      .where(eq(creations.shortId, asInt))
      .limit(1);
    creation = rows[0];
  }
  if (!creation) {
    const rows = await db
      .select()
      .from(creations)
      .where(eq(creations.id, input))
      .limit(1);
    creation = rows[0];
  }
  if (!creation) return null;

  const tagRows = await db
    .select({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(creationTags)
    .innerJoin(tags, eq(creationTags.tagId, tags.id))
    .where(eq(creationTags.creationId, creation.id));
  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(creationCategories)
    .innerJoin(categories, eq(creationCategories.categoryId, categories.id))
    .where(eq(creationCategories.creationId, creation.id));

  return { creation, tags: tagRows, categories: categoryRows };
}

export interface AuthorProfile {
  steamid: string;
  authorName: string | null;
  count: number;
}

export async function getAuthorProfile(steamid: string): Promise<AuthorProfile | null> {
  const db = getDb();
  const rows = await db
    .select({
      authorName: creations.authorName,
      count: sql<number>`count(*)::int`,
    })
    .from(creations)
    .where(
      and(eq(creations.status, "approved"), eq(creations.authorSteamid, steamid)),
    )
    .groupBy(creations.authorName)
    .limit(1);
  if (rows.length === 0) return null;
  return { steamid, authorName: rows[0].authorName, count: rows[0].count };
}

export async function getAuthorCreations(
  steamid: string,
  opts: { sort?: SortMode; limit?: number; offset?: number } = {},
): Promise<CreationCardRow[]> {
  const db = getDb();
  const { sort = "newest", limit = 24, offset = 0 } = opts;
  return db
    .select(cardColumns)
    .from(creations)
    .where(
      and(eq(creations.status, "approved"), eq(creations.authorSteamid, steamid)),
    )
    .orderBy(orderByForSort(sort))
    .limit(limit)
    .offset(offset);
}

export async function getApprovedKindCounts(): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db
    .select({ kind: creations.kind, n: sql<number>`count(*)::int` })
    .from(creations)
    .where(eq(creations.status, "approved"))
    .groupBy(creations.kind);
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

export async function getAllTags() {
  const db = getDb();
  return db.select().from(tags).orderBy(tags.name);
}

export async function getAllCategories() {
  const db = getDb();
  return db.select().from(categories).orderBy(categories.name);
}
