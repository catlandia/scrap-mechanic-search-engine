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
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import {
  categories,
  creationCategories,
  creationTags,
  creationViews,
  creationVotes,
  creations,
  favorites,
  reports,
  tagVotes,
  tags,
  users,
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
  // Site-native aggregates (denormalised; recomputed on every vote action).
  siteWeightedUp: number;
  siteWeightedDown: number;
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
  siteWeightedUp: creations.siteWeightedUp,
  siteWeightedDown: creations.siteWeightedDown,
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

// ---------------- v2.0 community helpers ----------------

export interface RoleVoteBreakdown {
  up: number;
  down: number;
  // Raw counts by role.
  userUp: number;
  userDown: number;
  modUp: number;
  modDown: number;
  eliteUp: number;
  eliteDown: number;
  creatorUp: number;
  creatorDown: number;
}

function emptyBreakdown(): RoleVoteBreakdown {
  return {
    up: 0,
    down: 0,
    userUp: 0,
    userDown: 0,
    modUp: 0,
    modDown: 0,
    eliteUp: 0,
    eliteDown: 0,
    creatorUp: 0,
    creatorDown: 0,
  };
}

function applyVote(
  bd: RoleVoteBreakdown,
  value: number,
  role: string | null | undefined,
) {
  if (value > 0) bd.up += 1;
  else if (value < 0) bd.down += 1;
  switch (role) {
    case "moderator":
      if (value > 0) bd.modUp += 1;
      else if (value < 0) bd.modDown += 1;
      break;
    case "elite_moderator":
      if (value > 0) bd.eliteUp += 1;
      else if (value < 0) bd.eliteDown += 1;
      break;
    case "creator":
      if (value > 0) bd.creatorUp += 1;
      else if (value < 0) bd.creatorDown += 1;
      break;
    default:
      if (value > 0) bd.userUp += 1;
      else if (value < 0) bd.userDown += 1;
  }
}

export interface TagWithVotes extends RoleVoteBreakdown {
  tagId: number;
  slug: string;
  name: string;
  categoryId: number | null;
  source: string;
  confirmed: boolean;
  rejected: boolean;
  /** -1, 0, or 1 — the viewer's current vote, 0 if unvoted or ghost. */
  viewerVote: -1 | 0 | 1;
}

export async function getCreationTagsWithVotes(
  creationId: string,
  viewerSteamid: string | null,
): Promise<TagWithVotes[]> {
  const db = getDb();

  const creationTagRows = await db
    .select({
      tagId: tags.id,
      slug: tags.slug,
      name: tags.name,
      categoryId: tags.categoryId,
      source: creationTags.source,
      confirmed: creationTags.confirmed,
      rejected: creationTags.rejected,
    })
    .from(creationTags)
    .innerJoin(tags, eq(creationTags.tagId, tags.id))
    .where(eq(creationTags.creationId, creationId));

  if (creationTagRows.length === 0) return [];

  const voteRows = await db
    .select({
      tagId: tagVotes.tagId,
      value: tagVotes.value,
      role: users.role,
    })
    .from(tagVotes)
    .innerJoin(users, eq(users.steamid, tagVotes.userId))
    .where(eq(tagVotes.creationId, creationId));

  const breakdownByTag = new Map<number, RoleVoteBreakdown>();
  for (const v of voteRows) {
    const bucket = breakdownByTag.get(v.tagId) ?? emptyBreakdown();
    applyVote(bucket, v.value, v.role);
    breakdownByTag.set(v.tagId, bucket);
  }

  const viewerVoteByTag = new Map<number, -1 | 1>();
  if (viewerSteamid) {
    const mine = await db
      .select({ tagId: tagVotes.tagId, value: tagVotes.value })
      .from(tagVotes)
      .where(
        and(
          eq(tagVotes.userId, viewerSteamid),
          eq(tagVotes.creationId, creationId),
        ),
      );
    for (const m of mine) {
      if (m.value === 1 || m.value === -1) viewerVoteByTag.set(m.tagId, m.value);
    }
  }

  return creationTagRows.map((r) => {
    const bd = breakdownByTag.get(r.tagId) ?? emptyBreakdown();
    return {
      tagId: r.tagId,
      slug: r.slug,
      name: r.name,
      categoryId: r.categoryId,
      source: r.source,
      confirmed: r.confirmed,
      rejected: r.rejected,
      viewerVote: viewerVoteByTag.get(r.tagId) ?? 0,
      ...bd,
    };
  });
}

export async function getCreationVoteBreakdown(
  creationId: string,
): Promise<RoleVoteBreakdown> {
  const db = getDb();
  const rows = await db
    .select({ value: creationVotes.value, role: users.role })
    .from(creationVotes)
    .innerJoin(users, eq(users.steamid, creationVotes.userId))
    .where(eq(creationVotes.creationId, creationId));

  const bd = emptyBreakdown();
  for (const v of rows) applyVote(bd, v.value, v.role);
  return bd;
}

export async function getUserVoteOnCreation(
  creationId: string,
  viewerSteamid: string,
): Promise<-1 | 0 | 1> {
  const db = getDb();
  const [row] = await db
    .select({ value: creationVotes.value })
    .from(creationVotes)
    .where(
      and(
        eq(creationVotes.userId, viewerSteamid),
        eq(creationVotes.creationId, creationId),
      ),
    )
    .limit(1);
  if (!row) return 0;
  return row.value === 1 || row.value === -1 ? row.value : 0;
}

export async function isCreationFavourited(
  creationId: string,
  viewerSteamid: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ creationId: favorites.creationId })
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, viewerSteamid),
        eq(favorites.creationId, creationId),
      ),
    )
    .limit(1);
  return !!row;
}

export interface SiteActivityCounts {
  siteFavourites: number;
  siteViews: number;
}

export async function getCreationSiteCounts(
  creationId: string,
): Promise<SiteActivityCounts> {
  const db = getDb();
  const [favRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.creationId, creationId));
  const [viewRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(creationViews)
    .where(eq(creationViews.creationId, creationId));
  return {
    siteFavourites: favRow?.n ?? 0,
    siteViews: viewRow?.n ?? 0,
  };
}

/**
 * Records that a signed-in user viewed a creation's detail page. Idempotent —
 * subsequent views bump lastViewedAt. Ghost viewers are ignored (no row).
 */
export async function recordCreationView(
  creationId: string,
  viewerSteamid: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .insert(creationViews)
    .values({
      userId: viewerSteamid,
      creationId,
      firstViewedAt: now,
      lastViewedAt: now,
    })
    .onConflictDoUpdate({
      target: [creationViews.userId, creationViews.creationId],
      set: { lastViewedAt: now },
    });
}

export interface PublicReportBadge {
  reason: string;
  customText: string | null;
  resolverNote: string | null;
  resolverName: string | null;
  resolverRole: string | null;
  resolverSteamid: string | null;
  resolvedAt: Date | null;
}

/**
 * Returns the most recently-actioned public report for a creation, or null.
 * Only status='actioned' rows surface — open reports stay private to mods.
 */
export async function getPublicReportBadge(
  creationId: string,
): Promise<PublicReportBadge | null> {
  const db = getDb();
  const [row] = await db
    .select({
      reason: reports.reason,
      customText: reports.customText,
      resolverNote: reports.resolverNote,
      resolvedAt: reports.resolvedAt,
      resolverSteamid: reports.resolverUserId,
      resolverName: users.personaName,
      resolverRole: users.role,
    })
    .from(reports)
    .leftJoin(users, eq(users.steamid, reports.resolverUserId))
    .where(
      and(
        eq(reports.creationId, creationId),
        eq(reports.status, "actioned"),
      ),
    )
    .orderBy(desc(reports.resolvedAt))
    .limit(1);

  return row
    ? {
        reason: row.reason,
        customText: row.customText,
        resolverNote: row.resolverNote,
        resolverName: row.resolverName,
        resolverRole: row.resolverRole,
        resolverSteamid: row.resolverSteamid,
        resolvedAt: row.resolvedAt,
      }
    : null;
}

export interface ModReportRow {
  id: number;
  creationId: string;
  creationShortId: number;
  creationTitle: string;
  creationThumbnail: string | null;
  creationSteamUrl: string;
  reason: string;
  customText: string | null;
  source: string;
  createdAt: Date;
  reporterSteamid: string | null;
  reporterName: string | null;
  reporterRole: string | null;
}

export async function getOpenReports(limit = 50): Promise<ModReportRow[]> {
  const db = getDb();
  return db
    .select({
      id: reports.id,
      creationId: reports.creationId,
      creationShortId: creations.shortId,
      creationTitle: creations.title,
      creationThumbnail: creations.thumbnailUrl,
      creationSteamUrl: creations.steamUrl,
      reason: reports.reason,
      customText: reports.customText,
      source: reports.source,
      createdAt: reports.createdAt,
      reporterSteamid: reports.reporterUserId,
      reporterName: users.personaName,
      reporterRole: users.role,
    })
    .from(reports)
    .innerJoin(creations, eq(creations.id, reports.creationId))
    .leftJoin(users, eq(users.steamid, reports.reporterUserId))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export interface ActionedReportRow extends ModReportRow {
  resolverNote: string | null;
  resolvedAt: Date | null;
  resolverName: string | null;
  resolverRole: string | null;
  resolverSteamid: string | null;
}

export async function getActionedReports(limit = 50): Promise<ActionedReportRow[]> {
  const db = getDb();
  const resolver = alias(users, "resolver");
  return db
    .select({
      id: reports.id,
      creationId: reports.creationId,
      creationShortId: creations.shortId,
      creationTitle: creations.title,
      creationThumbnail: creations.thumbnailUrl,
      creationSteamUrl: creations.steamUrl,
      reason: reports.reason,
      customText: reports.customText,
      source: reports.source,
      createdAt: reports.createdAt,
      reporterSteamid: reports.reporterUserId,
      reporterName: users.personaName,
      reporterRole: users.role,
      resolverNote: reports.resolverNote,
      resolvedAt: reports.resolvedAt,
      resolverSteamid: reports.resolverUserId,
      resolverName: resolver.personaName,
      resolverRole: resolver.role,
    })
    .from(reports)
    .innerJoin(creations, eq(creations.id, reports.creationId))
    .leftJoin(users, eq(users.steamid, reports.reporterUserId))
    .leftJoin(resolver, eq(resolver.steamid, reports.resolverUserId))
    .where(eq(reports.status, "actioned"))
    .orderBy(desc(reports.resolvedAt))
    .limit(limit);
}

export async function getUserFavourites(
  viewerSteamid: string,
  limit = 24,
  offset = 0,
): Promise<CreationCardRow[]> {
  const db = getDb();
  return db
    .select(cardColumns)
    .from(favorites)
    .innerJoin(creations, eq(creations.id, favorites.creationId))
    .where(
      and(
        eq(favorites.userId, viewerSteamid),
        eq(creations.status, "approved"),
      ),
    )
    .orderBy(desc(favorites.createdAt))
    .limit(limit)
    .offset(offset);
}
