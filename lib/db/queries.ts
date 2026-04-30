import { and, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import {
  categories,
  commentVotes,
  comments,
  creationCategories,
  creationTags,
  creationViews,
  creationVotes,
  creations,
  deployAnnouncements,
  favorites,
  notifications,
  reports,
  tagVotes,
  tags,
  users,
  type CreationKind,
  type DeployAnnouncement,
  type Notification,
  type NotificationTier,
} from "./schema";

export interface CreationCardRow {
  id: string;
  // Nullable because the column is now only assigned on first approval —
  // pending / rejected rows carry NULL. Public card queries filter on
  // `status = 'approved'` so in practice cards always have one, but the
  // type matches the schema so non-approved read paths stay honest.
  shortId: number | null;
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
  /** Null when the item came from the ingest cron; set for user-submitted items. */
  uploadedByUserId: string | null;
}

export const cardColumns = {
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
  uploadedByUserId: creations.uploadedByUserId,
};

export const SORT_MODES = [
  "relevance",
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
  "site-rating",
  "site-least-rating",
] as const;
export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Record<SortMode, string> = {
  relevance: "Most relevant",
  newest: "Newest on site",
  oldest: "Oldest on site",
  "steam-newest": "Newest on Steam",
  "steam-oldest": "Oldest on Steam",
  popular: "Most subscribers (Steam)",
  unpopular: "Fewest subscribers (Steam)",
  favorites: "Most favourites (Steam)",
  "least-favorites": "Fewest favourites (Steam)",
  rating: "Highest rated (Steam)",
  "least-rating": "Lowest rated (Steam)",
  "site-rating": "Highest upvote score (Site)",
  "site-least-rating": "Lowest upvote score (Site)",
};

export function parseSortMode(raw: string | undefined | null): SortMode {
  if (raw && (SORT_MODES as readonly string[]).includes(raw)) return raw as SortMode;
  return "newest";
}

// `?page=` URL param → zero-indexed offset. Non-numeric input lands on page 0
// rather than NaN. `maxIndex` caps how deep into OFFSET queries a caller can
// drive — important because OFFSET on large tables is linear in the offset
// size, so a 1,000,000-page request would thrash Neon.
export function parsePageIndex(
  raw: string | undefined | null,
  maxIndex = 200,
): number {
  const n = Number(raw ?? "1");
  if (!Number.isFinite(n)) return 0;
  return Math.min(maxIndex, Math.max(0, Math.trunc(n) - 1));
}

// Combines websearch (handles phrase quotes, OR, -negation) with a prefix
// pass so partial typing still matches: `cann` finds "cannon" via `cann:*`.
// Tokens are stripped of non-word chars before going through to_tsquery so
// we never build an invalid expression.
function tsQueryExpr(q: string): SQL {
  const tokens = q.match(/\w+/g) ?? [];
  if (tokens.length === 0) {
    return sql`websearch_to_tsquery('english', ${q})`;
  }
  const prefix = tokens.map((t) => `${t}:*`).join(" & ");
  return sql`(websearch_to_tsquery('english', ${q}) || to_tsquery('english', ${prefix}))`;
}

function orderByForSort(sort: SortMode, q?: string): SQL {
  switch (sort) {
    case "relevance":
      if (q && q.trim()) {
        return sql`ts_rank_cd(${creations.searchVector}, ${tsQueryExpr(q.trim())}) DESC NULLS LAST`;
      }
      return sql`${creations.approvedAt} DESC NULLS LAST`;
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
    // Net upvote score (up - down). Simpler and more legible than the
    // old ratio-with-floor: 100↑/10↓ beats 5↑/0↓, items with zero votes
    // land at 0 and mix with the tail rather than being gated out.
    case "site-rating":
      return sql`(${creations.siteWeightedUp} - ${creations.siteWeightedDown}) DESC`;
    case "site-least-rating":
      return sql`(${creations.siteWeightedUp} - ${creations.siteWeightedDown}) ASC`;
  }
}

// Tiles and worlds both ship in large batches (terrain packs, full map
// sets, entire survival worlds) and would otherwise crowd out every
// other kind on the home page and /new. This condition keeps roughly
// 5% of them — `mod 20 = 0` on a stable per-row hash — so the visible
// set is deterministic across requests, pagination, and cache. Hidden
// rows stay in the catalogue; search, /tiles, /worlds, and any kind-
// scoped listing bypass this so anyone explicitly looking for one of
// these kinds gets the full list.
export const HIGH_VOLUME_THIN_CONDITION = sql`(${creations.kind} NOT IN ('tile', 'world') OR (abs(hashtext(${creations.id})) % 20) = 0)`;

export async function getNewestApproved(
  limit = 24,
  offset = 0,
): Promise<CreationCardRow[]> {
  const db = getDb();
  return db
    .select(cardColumns)
    .from(creations)
    .where(and(eq(creations.status, "approved"), HIGH_VOLUME_THIN_CONDITION))
    .orderBy(desc(creations.approvedAt))
    .limit(limit)
    .offset(offset);
}

export interface KindTopTag {
  id: number;
  slug: string;
  name: string;
  count: number;
}

// Powers the tag filter sidebar on /[kind] pages. Counts every non-rejected
// creation_tags row — community nominations below the +3 visibility threshold
// don't appear on many creations in practice, so they rarely rise to the top
// 20 and it's not worth the extra JOIN to filter them out here.
export async function getTopTagsForKind(
  kind: CreationKind,
  limit = 20,
): Promise<KindTopTag[]> {
  const db = getDb();
  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      count: sql<number>`count(*)::int`,
    })
    .from(creationTags)
    .innerJoin(creations, eq(creations.id, creationTags.creationId))
    .innerJoin(tags, eq(tags.id, creationTags.tagId))
    .where(
      and(
        eq(creations.kind, kind),
        eq(creations.status, "approved"),
        eq(creationTags.rejected, false),
      ),
    )
    .groupBy(tags.id, tags.slug, tags.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
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
  // Creations that carry any of these tags are filtered OUT. Combines with
  // tagSlugs: e.g. tagSlugs=['car'] + excludeTagSlugs=['mod'] → cars that
  // aren't mod-class creations.
  excludeTagSlugs?: string[];
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
  // Search never thins: a user typing a query / picking a tag / sort is
  // explicitly looking for something, so hiding 75% of tiles would feel
  // broken. Thinning only applies to the home page and /new, where the
  // full catalogue would otherwise bury non-tile kinds.

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

  // Exclude: OR semantics — a creation matching ANY of the excluded tags is
  // dropped. Silently drop slugs that don't resolve (user might have an
  // outdated URL referencing a deleted tag; no reason to blank the results).
  if (filters.excludeTagSlugs && filters.excludeTagSlugs.length > 0) {
    const excludeIds = await tagIdsForSlugs(filters.excludeTagSlugs);
    if (excludeIds.length > 0) {
      const excluded = await db
        .selectDistinct({ id: creationTags.creationId })
        .from(creationTags)
        .where(inArray(creationTags.tagId, excludeIds));
      if (excluded.length > 0) {
        where.push(
          sql`${creations.id} NOT IN (${sql.join(
            excluded.map((r) => sql`${r.id}`),
            sql`, `,
          )})`,
        );
      }
    }
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

  const trimmedQ = filters.q?.trim() ?? "";
  if (trimmedQ) {
    where.push(sql`${creations.searchVector} @@ ${tsQueryExpr(trimmedQ)}`);
  }

  const condition = where.length === 1 ? where[0] : and(...where);
  const effectiveSort: SortMode =
    filters.sort ?? (trimmedQ ? "relevance" : "newest");
  const orderBy = orderByForSort(effectiveSort, trimmedQ);

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

/**
 * Match expression: this steamid is EITHER the primary `authorSteamid` OR
 * listed in the `creators` jsonb array. Co-authors on collaboration items
 * (scraped from the Workshop sidebar) must appear on /author/[steamid]
 * too, otherwise clicking a contributor name leads to an empty page.
 */
function authorMatch(steamid: string): SQL {
  return sql`(${creations.authorSteamid} = ${steamid} or ${creations.creators} @> ${JSON.stringify([{ steamid }])}::jsonb)`;
}

export async function getAuthorProfile(steamid: string): Promise<AuthorProfile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      // Prefer the primary authorName on rows where this steamid is primary;
      // fall back to the name stored inside the creators array for the
      // matching steamid (so contributors get a name even when they've
      // never been a primary author).
      authorName: sql<string | null>`
        coalesce(
          max(case when ${creations.authorSteamid} = ${steamid} then ${creations.authorName} end),
          max((
            select elem->>'name'
            from jsonb_array_elements(${creations.creators}) as elem
            where elem->>'steamid' = ${steamid}
            limit 1
          ))
        )
      `,
    })
    .from(creations)
    .where(and(eq(creations.status, "approved"), authorMatch(steamid)));
  if (!row || row.count === 0) return null;
  return { steamid, authorName: row.authorName ?? null, count: row.count };
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
    .where(and(eq(creations.status, "approved"), authorMatch(steamid)))
    .orderBy(orderByForSort(sort))
    .limit(limit)
    .offset(offset);
}

export interface TopCreatorRow {
  steamid: string;
  name: string | null;
  count: number;
  // Populated when the creator has signed in to the site — uses their live
  // persona + Steam avatar from the `users` table instead of the stale
  // author_name cached on creation rows.
  avatarUrl: string | null;
  signedIn: boolean;
}

// All authors across both the primary `authorSteamid` axis and the co-author
// `creators[]` jsonb axis, counted distinctly by creation id so a person who
// appears as both primary and co-author on the same item doesn't double-
// count. Optional `q` filters by case-insensitive name substring.
export async function getTopCreators(
  opts: {
    q?: string;
    limit?: number;
    offset?: number;
    kind?: CreationKind;
  } = {},
): Promise<TopCreatorRow[]> {
  const db = getDb();
  const { q = "", limit = 60, offset = 0, kind } = opts;
  const trimmedQ = q.trim();
  const hasQ = trimmedQ.length > 0;
  const like = `%${trimmedQ}%`;
  const kindFilterPrimary = kind
    ? sql`and ${creations.kind} = ${kind}`
    : sql``;
  const kindFilterCoauthor = kind ? sql`and c.kind = ${kind}` : sql``;
  const nameFilter = hasQ
    ? sql`where coalesce(u.persona_name, a.cached_name, '') ilike ${like}`
    : sql``;

  // The filter (`name ilike ?`) runs against the live users.persona_name when
  // the creator has signed in, falling back to the cached creation author_name
  // — searching by whichever name the visitor is most likely to know.
  const query = sql`
    with combined as (
      select id as creation_id,
             ${creations.authorSteamid} as steamid,
             ${creations.authorName} as name
      from ${creations}
      where ${creations.status} = 'approved'
        and ${creations.authorSteamid} is not null
        ${kindFilterPrimary}
      union
      select c.id,
             (elem->>'steamid')::text,
             (elem->>'name')::text
      from ${creations} c, jsonb_array_elements(c.creators) as elem
      where c.status = 'approved'
        ${kindFilterCoauthor}
    ),
    agg as (
      select steamid,
             max(name) as cached_name,
             count(distinct creation_id)::int as count
      from combined
      where steamid is not null
      group by steamid
    )
    select a.steamid,
           coalesce(u.persona_name, a.cached_name) as name,
           u.avatar_url as avatar_url,
           (u.steamid is not null) as signed_in,
           a.count
    from agg a
    left join ${users} u on u.steamid = a.steamid
    ${nameFilter}
    order by a.count desc, name asc nulls last
    limit ${limit}
    offset ${offset}
  `;
  const result = await db.execute(query);
  return (
    result.rows as Array<{
      steamid: string;
      name: string | null;
      avatar_url: string | null;
      signed_in: boolean;
      count: number;
    }>
  ).map((r) => ({
    steamid: r.steamid,
    name: r.name ?? null,
    avatarUrl: r.avatar_url ?? null,
    signedIn: !!r.signed_in,
    count: r.count,
  }));
}

// "For you" feed. Scores candidate creations by how many of the viewer's
// liked tags they carry, breaks ties on site upvote score and Steam subs,
// and excludes anything the viewer has already favorited / voted on / viewed
// / commented on. Signed-out viewers and viewers without enough positive
// signal fall through to a plain trending feed so the slot still gives value.
export async function getForYouFeed(
  viewerSteamid: string | null,
  limit = 12,
): Promise<CreationCardRow[]> {
  if (!viewerSteamid) return getTrendingFeed(limit);

  const db = getDb();

  // Liked tags = directly upvoted tags + tags carried by creations the viewer
  // favorited or upvoted. Combining both pulls in implicit signal even when
  // the viewer hasn't explicitly voted on tags yet.
  const directLikedTags = await db
    .select({ tagId: tagVotes.tagId })
    .from(tagVotes)
    .where(and(eq(tagVotes.userId, viewerSteamid), eq(tagVotes.value, 1)));

  const favoritedIds = (
    await db
      .select({ id: favorites.creationId })
      .from(favorites)
      .where(eq(favorites.userId, viewerSteamid))
  ).map((r) => r.id);
  const upvotedIds = (
    await db
      .select({ id: creationVotes.creationId })
      .from(creationVotes)
      .where(
        and(eq(creationVotes.userId, viewerSteamid), eq(creationVotes.value, 1)),
      )
  ).map((r) => r.id);
  const positiveCreationIds = Array.from(
    new Set([...favoritedIds, ...upvotedIds]),
  );

  let viaCreationsTags: number[] = [];
  if (positiveCreationIds.length > 0) {
    const rows = await db
      .select({ tagId: creationTags.tagId })
      .from(creationTags)
      .where(
        and(
          inArray(creationTags.creationId, positiveCreationIds),
          eq(creationTags.rejected, false),
        ),
      );
    viaCreationsTags = rows.map((r) => r.tagId);
  }

  const likedTagIds = Array.from(
    new Set([...directLikedTags.map((r) => r.tagId), ...viaCreationsTags]),
  );

  // Need at least two liked tags to call this a meaningful "for you" mix.
  if (likedTagIds.length < 2) return getTrendingFeed(limit);

  // "Seen" set — anything the viewer already engaged with shouldn't appear.
  const seenRows = [
    ...favoritedIds,
    ...(
      await db
        .select({ id: creationVotes.creationId })
        .from(creationVotes)
        .where(eq(creationVotes.userId, viewerSteamid))
    ).map((r) => r.id),
    ...(
      await db
        .select({ id: creationViews.creationId })
        .from(creationViews)
        .where(eq(creationViews.userId, viewerSteamid))
    ).map((r) => r.id),
    ...(
      await db
        .select({ id: comments.creationId })
        .from(comments)
        .where(
          and(
            eq(comments.userId, viewerSteamid),
            sql`${comments.creationId} IS NOT NULL`,
          ),
        )
    )
      .map((r) => r.id)
      .filter((x): x is string => x != null),
  ];
  const seen = Array.from(new Set(seenRows));

  const conditions: SQL[] = [
    eq(creations.status, "approved"),
    eq(creationTags.rejected, false),
    inArray(creationTags.tagId, likedTagIds),
  ];
  if (seen.length > 0) conditions.push(notInArray(creations.id, seen));

  const matchedRows = await db
    .select({ ...cardColumns, overlap: sql<number>`count(*)::int` })
    .from(creationTags)
    .innerJoin(creations, eq(creations.id, creationTags.creationId))
    .where(and(...conditions))
    .groupBy(creations.id)
    .orderBy(
      sql`count(*) DESC`,
      sql`(${creations.siteWeightedUp} - ${creations.siteWeightedDown}) DESC`,
      desc(creations.subscriptions),
    )
    .limit(limit);

  const matched: CreationCardRow[] = matchedRows.map((row) => {
    const { overlap, ...rest } = row;
    void overlap;
    return rest as CreationCardRow;
  });
  if (matched.length >= limit) return matched;

  // Top up with trending so the row is always full.
  const have = new Set(matched.map((m) => m.id));
  for (const id of seen) have.add(id);
  const fill = await getTrendingFeed(limit * 2);
  for (const t of fill) {
    if (have.has(t.id)) continue;
    matched.push(t);
    if (matched.length >= limit) break;
  }
  return matched;
}

// Quality-ordered list used as the signed-out / cold-start "For you"
// fallback. Sorted by site upvote net first (so curated signal beats raw
// Steam popularity when the site has any signal at all), then Steam subs.
// Tile/world thinning still applies so they don't dominate the row.
export async function getTrendingFeed(limit: number): Promise<CreationCardRow[]> {
  const db = getDb();
  return db
    .select(cardColumns)
    .from(creations)
    .where(and(eq(creations.status, "approved"), HIGH_VOLUME_THIN_CONDITION))
    .orderBy(
      sql`(${creations.siteWeightedUp} - ${creations.siteWeightedDown}) DESC`,
      desc(creations.subscriptions),
    )
    .limit(limit);
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

// Footer presence counters. One scan with a FILTER aggregate returns both
// `total` (excluding hard-banned) and `online` (`lastSeenAt` within the
// window). Hard-banned rows are excluded from total because they can't
// contribute to online either — getCurrentUser short-circuits before the
// lastSeenAt bump, so leaving them in would double-skew both numbers.
const ONLINE_WINDOW_MINUTES = 5;

export async function getUserCounts(): Promise<{ total: number; online: number }> {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      online: sql<number>`count(*) filter (where ${users.lastSeenAt} > now() - make_interval(mins => ${ONLINE_WINDOW_MINUTES}))::int`,
    })
    .from(users)
    .where(eq(users.hardBanned, false));
  return { total: row?.total ?? 0, online: row?.online ?? 0 };
}

export async function getAllTags() {
  const db = getDb();
  // Explicit column list so the query keeps working if newer columns
  // (created_by_user_id / created_at from V9.1) aren't yet applied in prod.
  // Drizzle's `.select()` shorthand emits SELECT *, which errors if any
  // schema column doesn't physically exist in the target DB.
  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      categoryId: tags.categoryId,
    })
    .from(tags)
    .orderBy(tags.name);
}

export async function getAllCategories() {
  const db = getDb();
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .orderBy(categories.name);
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
  categoryName: string | null;
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
      categoryName: categories.name,
      source: creationTags.source,
      confirmed: creationTags.confirmed,
      rejected: creationTags.rejected,
    })
    .from(creationTags)
    .innerJoin(tags, eq(creationTags.tagId, tags.id))
    .leftJoin(categories, eq(categories.id, tags.categoryId))
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
      categoryName: r.categoryName ?? null,
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
 * Records that a signed-in user viewed a creation's detail page. First visit
 * inserts; repeat visits only bump lastViewedAt if it's been > 1 hour since
 * the last bump, so refreshes / tab-switching don't hammer the DB. Ghosts are
 * ignored (no row).
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
      set: {
        lastViewedAt: sql`CASE WHEN ${creationViews.lastViewedAt} < now() - interval '1 hour' THEN now() ELSE ${creationViews.lastViewedAt} END`,
      },
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
        // Comment-targeted reports must not colour the creation badge.
        sql`${reports.commentId} IS NULL`,
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
  // Either creationId or commentId is set (enforced by CHECK constraint).
  creationId: string | null;
  creationShortId: number | null;
  creationTitle: string | null;
  creationThumbnail: string | null;
  creationSteamUrl: string | null;
  commentId: number | null;
  commentBody: string | null;
  commentAuthorSteamid: string | null;
  commentAuthorName: string | null;
  commentAuthorRole: string | null;
  commentCreationId: string | null;
  commentCreationShortId: number | null;
  commentCreationTitle: string | null;
  commentProfileSteamid: string | null;
  reason: string;
  customText: string | null;
  source: string;
  createdAt: Date;
  reporterSteamid: string | null;
  reporterName: string | null;
  reporterRole: string | null;
}

// Both creation- and comment-targeted reports flow through the same admin
// queue. A comment report joins through `comments` (and its parent creation
// or profile) rather than through `creations` directly, so both target
// shapes come back with enough context for one renderer to handle.
const commentAuthor = alias(users, "comment_author");
const commentCreation = alias(creations, "comment_creation");

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
      commentId: reports.commentId,
      commentBody: comments.body,
      commentAuthorSteamid: comments.userId,
      commentAuthorName: commentAuthor.personaName,
      commentAuthorRole: commentAuthor.role,
      commentCreationId: comments.creationId,
      commentCreationShortId: commentCreation.shortId,
      commentCreationTitle: commentCreation.title,
      commentProfileSteamid: comments.profileSteamid,
      reason: reports.reason,
      customText: reports.customText,
      source: reports.source,
      createdAt: reports.createdAt,
      reporterSteamid: reports.reporterUserId,
      reporterName: users.personaName,
      reporterRole: users.role,
    })
    .from(reports)
    .leftJoin(creations, eq(creations.id, reports.creationId))
    .leftJoin(comments, eq(comments.id, reports.commentId))
    .leftJoin(commentAuthor, eq(commentAuthor.steamid, comments.userId))
    .leftJoin(commentCreation, eq(commentCreation.id, comments.creationId))
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
  // Actioned list exists to surface the public "flagged" badge on creations —
  // only creation-targeted reports belong here. Comment reports, once
  // actioned, are terminal (the comment is deleted or the report cleared).
  return db
    .select({
      id: reports.id,
      creationId: reports.creationId,
      creationShortId: creations.shortId,
      creationTitle: creations.title,
      creationThumbnail: creations.thumbnailUrl,
      creationSteamUrl: creations.steamUrl,
      commentId: reports.commentId,
      commentBody: sql<string | null>`NULL`,
      commentAuthorSteamid: sql<string | null>`NULL`,
      commentAuthorName: sql<string | null>`NULL`,
      commentAuthorRole: sql<string | null>`NULL`,
      commentCreationId: sql<string | null>`NULL`,
      commentCreationShortId: sql<number | null>`NULL`,
      commentCreationTitle: sql<string | null>`NULL`,
      commentProfileSteamid: sql<string | null>`NULL`,
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
    .where(
      and(
        eq(reports.status, "actioned"),
        sql`${reports.commentId} IS NULL`,
        eq(creations.status, "approved"),
      ),
    )
    .orderBy(desc(reports.resolvedAt))
    .limit(limit);
}

export interface CreationCommentRow {
  id: number;
  // Exactly one of creationId / profileSteamid is non-null.
  creationId: string | null;
  profileSteamid: string | null;
  parentId: number | null;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  authorSteamid: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: string;
  votesUp: number;
  votesDown: number;
  viewerVote: -1 | 0 | 1;
}

// Returned oldest-first so the tree-builder on the client has stable ordering;
// the client reverses root-level order afterwards to put newest threads on top.
async function fetchComments(
  where: SQL,
  viewerSteamid: string | null,
  limit: number,
): Promise<CreationCommentRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      creationId: comments.creationId,
      profileSteamid: comments.profileSteamid,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      authorSteamid: users.steamid,
      authorName: users.personaName,
      authorAvatarUrl: users.avatarUrl,
      authorRole: users.role,
      votesUp: comments.votesUp,
      votesDown: comments.votesDown,
    })
    .from(comments)
    .innerJoin(users, eq(users.steamid, comments.userId))
    .where(where)
    .orderBy(comments.createdAt)
    .limit(limit);

  if (!viewerSteamid || rows.length === 0) {
    return rows.map((r) => ({ ...r, viewerVote: 0 as const }));
  }

  const commentIds = rows.map((r) => r.id);
  const voteRows = await db
    .select({ commentId: commentVotes.commentId, value: commentVotes.value })
    .from(commentVotes)
    .where(
      and(
        eq(commentVotes.userId, viewerSteamid),
        inArray(commentVotes.commentId, commentIds),
      ),
    );
  const voteByComment = new Map(voteRows.map((v) => [v.commentId, v.value]));
  return rows.map((r) => {
    const v = voteByComment.get(r.id);
    const viewerVote: -1 | 0 | 1 = v === 1 ? 1 : v === -1 ? -1 : 0;
    return { ...r, viewerVote };
  });
}

export function getCreationComments(
  creationId: string,
  viewerSteamid: string | null,
  limit = 200,
): Promise<CreationCommentRow[]> {
  return fetchComments(eq(comments.creationId, creationId), viewerSteamid, limit);
}

export function getProfileComments(
  profileSteamid: string,
  viewerSteamid: string | null,
  limit = 200,
): Promise<CreationCommentRow[]> {
  return fetchComments(
    eq(comments.profileSteamid, profileSteamid),
    viewerSteamid,
    limit,
  );
}

export interface AuthoredCommentRow {
  id: number;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  votesUp: number;
  votesDown: number;
  // Exactly one of these target shapes is set per row.
  creationTarget: {
    id: string;
    shortId: number | null;
    title: string;
    kind: string;
  } | null;
  profileTarget: {
    steamid: string;
    personaName: string;
  } | null;
}

// Comments authored by `authorSteamid`, newest-first, with enough info on
// each row to render a link back to the source (creation page or profile
// wall). Soft-deleted rows are omitted unless the viewer is a moderator.
export async function getCommentsByAuthor(
  authorSteamid: string,
  viewerIsMod: boolean,
  limit = 25,
): Promise<AuthoredCommentRow[]> {
  const db = getDb();
  const profileUser = alias(users, "profile_user");
  const conditions: SQL[] = [eq(comments.userId, authorSteamid)];
  if (!viewerIsMod) {
    conditions.push(sql`${comments.deletedAt} IS NULL`);
  }
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      votesUp: comments.votesUp,
      votesDown: comments.votesDown,
      creationId: comments.creationId,
      creationShortId: creations.shortId,
      creationTitle: creations.title,
      creationKind: creations.kind,
      creationStatus: creations.status,
      profileSteamid: comments.profileSteamid,
      profilePersona: profileUser.personaName,
    })
    .from(comments)
    .leftJoin(creations, eq(creations.id, comments.creationId))
    .leftJoin(profileUser, eq(profileUser.steamid, comments.profileSteamid))
    .where(and(...conditions))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  return rows
    .filter(
      // Hide comments that point at non-approved creations (rejected /
      // pending / archived) so we don't leak moderation state through the
      // commenter's profile. Profile-wall comments always pass.
      (r) =>
        r.creationId == null ||
        r.creationStatus === "approved" ||
        viewerIsMod,
    )
    .map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      deletedAt: r.deletedAt,
      votesUp: r.votesUp,
      votesDown: r.votesDown,
      creationTarget:
        r.creationId && r.creationTitle && r.creationKind
          ? {
              id: r.creationId,
              shortId: r.creationShortId ?? null,
              title: r.creationTitle,
              kind: r.creationKind,
            }
          : null,
      profileTarget: r.profileSteamid
        ? {
            steamid: r.profileSteamid,
            personaName: r.profilePersona ?? "(unknown)",
          }
        : null,
    }));
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

export async function getUnreadNotificationCount(
  userId: string,
  tier?: NotificationTier,
): Promise<number> {
  const db = getDb();
  const filter = tier
    ? and(
        eq(notifications.userId, userId),
        eq(notifications.read, false),
        eq(notifications.tier, tier),
      )
    : and(eq(notifications.userId, userId), eq(notifications.read, false));
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(filter);
  return row?.n ?? 0;
}

export async function getUnreadNotificationCountsByTier(
  userId: string,
): Promise<Record<NotificationTier, number>> {
  const db = getDb();
  const rows = await db
    .select({ tier: notifications.tier, n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .groupBy(notifications.tier);
  const out: Record<NotificationTier, number> = {
    user: 0,
    moderator: 0,
    elite_moderator: 0,
    creator: 0,
  };
  for (const r of rows) {
    if (r.tier in out) out[r.tier as NotificationTier] = r.n;
  }
  return out;
}

export async function getUserNotifications(
  userId: string,
  limit = 50,
  tier?: NotificationTier,
): Promise<Notification[]> {
  const db = getDb();
  const filter = tier
    ? and(eq(notifications.userId, userId), eq(notifications.tier, tier))
    : eq(notifications.userId, userId);
  return db
    .select()
    .from(notifications)
    .where(filter)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllNotificationsRead(
  userId: string,
  tier?: NotificationTier,
): Promise<void> {
  const db = getDb();
  const filter = tier
    ? and(
        eq(notifications.userId, userId),
        eq(notifications.read, false),
        eq(notifications.tier, tier),
      )
    : and(eq(notifications.userId, userId), eq(notifications.read, false));
  await db.update(notifications).set({ read: true }).where(filter);
}

export async function markNotificationRead(
  userId: string,
  notificationId: number,
): Promise<{ link: string | null } | null> {
  const db = getDb();
  const [row] = await db
    .select({ link: notifications.link, userId: notifications.userId })
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);
  if (!row || row.userId !== userId) return null;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
  return { link: row.link };
}

export async function getUserSubmissions(userId: string, limit = 50, offset = 0): Promise<(typeof creations.$inferSelect)[]> {
  const db = getDb();
  return db
    .select()
    .from(creations)
    .where(eq(creations.uploadedByUserId, userId))
    .orderBy(desc(creations.ingestedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Returns the most-recent deploy announcement that hasn't fully rolled off
 * yet, or null. A row is "active" if it's uncompleted (the build hasn't
 * marked it done) OR was completed within the last 2 minutes (give clients
 * time to see the completed state and auto-reload). Older rows are still
 * in the table as a deploy log but don't surface on the banner.
 */
export async function getActiveDeployAnnouncement(): Promise<DeployAnnouncement | null> {
  const db = getDb();
  // Real rows: alive while uncompleted, plus a 2-minute tail after
  // completion so laggy clients still see the completed state and reload.
  // Prank rows (from /admin/abuse): alive from insertion through
  // scheduled_at + 10s. They never get completed; the short tail is all
  // the window the banner needs to show the "just kidding :^)" swap.
  const [row] = await db
    .select()
    .from(deployAnnouncements)
    .where(
      sql`(${deployAnnouncements.isPrank} = false
            AND (${deployAnnouncements.completedAt} IS NULL
                 OR ${deployAnnouncements.completedAt} > now() - interval '2 minutes'))
          OR (${deployAnnouncements.isPrank} = true
              AND ${deployAnnouncements.scheduledAt} > now() - interval '10 seconds')`,
    )
    .orderBy(desc(deployAnnouncements.scheduledAt))
    .limit(1);
  return row ?? null;
}
