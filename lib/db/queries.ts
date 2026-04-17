import {
  and,
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
  title: string;
  thumbnailUrl: string | null;
  steamUrl: string;
  kind: string;
  authorName: string | null;
  subscriptions: number;
  favorites: number;
  voteScore: number | null;
  approvedAt: Date | null;
}

const cardColumns = {
  id: creations.id,
  title: creations.title,
  thumbnailUrl: creations.thumbnailUrl,
  steamUrl: creations.steamUrl,
  kind: creations.kind,
  authorName: creations.authorName,
  subscriptions: creations.subscriptions,
  favorites: creations.favorites,
  voteScore: creations.voteScore,
  approvedAt: creations.approvedAt,
};

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
  opts: { sort?: "newest" | "popular"; limit?: number; offset?: number } = {},
): Promise<CreationCardRow[]> {
  const db = getDb();
  const { sort = "newest", limit = 24, offset = 0 } = opts;
  const orderBy =
    sort === "popular"
      ? desc(creations.subscriptions)
      : desc(creations.approvedAt);
  return db
    .select(cardColumns)
    .from(creations)
    .where(and(eq(creations.status, "approved"), eq(creations.kind, kind)))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
}

export interface SearchFilters {
  kind?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  q?: string;
  sort?: "newest" | "popular";
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
  const orderBy =
    filters.sort === "popular"
      ? desc(creations.subscriptions)
      : desc(creations.approvedAt);

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

export async function getCreationDetail(id: string): Promise<CreationDetail | null> {
  const db = getDb();
  const [creation] = await db
    .select()
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);
  if (!creation) return null;

  const tagRows = await db
    .select({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(creationTags)
    .innerJoin(tags, eq(creationTags.tagId, tags.id))
    .where(eq(creationTags.creationId, id));
  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(creationCategories)
    .innerJoin(categories, eq(creationCategories.categoryId, categories.id))
    .where(eq(creationCategories.creationId, id));

  return { creation, tags: tagRows, categories: categoryRows };
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
