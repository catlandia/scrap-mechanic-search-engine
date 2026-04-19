# Database Queries

All typed query helpers are in `lib/db/queries.ts`. These are the read-side counterpart to the server actions in `app/admin/actions.ts`.

---

## Card Row Type

Most list views use `CreationCardRow` — a minimal set of columns returned for grid display:

```ts
{
  id, shortId, title, kind, status,
  thumbnailUrl, steamUrl, authorName, authorSteamid,
  subscriptions, favorites, views, voteScore,
  approvedAt, timeCreated,
  siteWeightedUp, siteWeightedDown,
}
```

The denormalized `siteWeightedUp/Down` columns avoid a GROUP BY join on every card render.

---

## Public Listing Queries

### `getNewestApproved(limit, offset)`
Returns `status=approved` creations ordered by `approvedAt DESC`. Used on the home page and `/new`.

### `getApprovedByKind(kind, { sort, limit, offset })`
Filter by one `kind`. Used on per-kind landing pages. Accepts any `SortMode` except `relevance` (which falls back to `newest` without a query string).

### `searchApproved(filters, page, pageSize)`

Full-featured search function. Accepts:

```ts
{
  kind?: string,          // filter to one kind
  categorySlug?: string,  // filter via creationCategories join
  tagSlugs?: string[],    // ALL must match (intersection)
  q?: string,             // tsvector @@ websearch_to_tsquery(q)
  sort?: SortMode,        // defaults to "relevance" when q is set, else "newest"
}
```

**Tag intersection implementation:** Uses a subquery on `creationTags` with `COUNT(DISTINCT tag_id) = tagSlugs.length` — requires ALL requested tags to be present. Not a union.

**Text search:** `creations.searchVector @@ websearch_to_tsquery('english', q)`. `searchVector` is a generated-stored column maintained by Postgres, so there's nothing to keep in sync at the application layer. Relevance sort uses `ts_rank_cd(searchVector, websearch_to_tsquery('english', q))`.

Returns: `{ items: CreationCardRow[], total: number, page: number, pageSize: number }`

---

## Detail Queries

### `getCreationDetail(input)`

Accepts either `{ shortId: number }` or `{ publishedfileid: string }`. Returns the full creation row plus its tags and categories. Returns `null` if not found.

### `getCreationTagsWithVotes(creationId, viewerSteamid)`

Returns all visible tags for a creation with vote breakdowns:

```ts
{
  tagId, tagSlug, tagName, categoryId, categoryName,
  source, confirmed, rejected,
  upvotes, downvotes,                    // overall counts
  viewerVote,                            // -1 | 0 | 1 for the current viewer
  byRole: {                              // vote counts per role
    user: { up, down },
    moderator: { up, down },
    elite_moderator: { up, down },
    creator: { up, down },
  }
}
```

Only returns tags where `rejected = false` AND (`confirmed = true` OR net votes ≥ 3).

### `getCreationVoteBreakdown(creationId)`

Same role-based breakdown but for creation votes (not tag votes). Shown in the vote panel on the detail page.

### `getPublicReportBadge(creationId)`

Returns the most recent `actioned` report for a creation (if any) — displayed as a badge on the card and detail page to signal the content has been flagged and reviewed.

---

## User / Author Queries

### `getAuthorProfile(steamid)`

Returns author display name + total count of approved creations. Used on the author and profile pages.

### `getAuthorCreations(steamid, { sort, limit, offset })`

Paginated list of `status=approved` creations by a specific Steam author. Sort modes same as `getApprovedByKind`.

---

## Engagement Queries

### `getUserVoteOnCreation(creationId, steamid)`

Returns `-1`, `0`, or `1`. Used to pre-populate vote buttons on the detail page.

### `isCreationFavourited(creationId, steamid)`

Boolean. Used to set the initial state of the favorite button.

### `recordCreationView(creationId, steamid)`

Upserts into `creationViews`. Sets `firstViewedAt` on first visit, bumps `lastViewedAt` on repeat. Called before displaying the detail page so the viewer sees their own view counted immediately.

### `getCreationSiteCounts(creationId)`

Returns site-native counts (not Steam's): total favorites, total views from `creationViews`. Shown alongside Steam's metrics on the detail page.

---

## Taxonomy Queries

### `getAllTags()`

Returns all tags ordered by name. Used to populate tag filter chips in search.

### `getAllCategories()`

Returns all categories ordered by name.

### `getApprovedKindCounts()`

Returns a `Record<Kind, number>` mapping each kind to its count of approved creations. Used on the home page dashboard.

### `getUserCounts()`

Returns `{ total, online }` for the footer presence display. Both counts come from one scan of the `users` table: `total = COUNT(*) WHERE NOT hard_banned`; `online = COUNT(*) FILTER (WHERE last_seen_at > now() - interval '5 minutes')`. Backed by `users_last_seen_idx`. Anonymous visitors aren't tracked — the counter only reflects signed-in accounts.

---

## Suggestion Queries (in `lib/suggestions/actions.ts`)

### `getApprovedSuggestions(viewerSteamid?)`

Returns `status=approved` suggestions, ordered by net votes DESC then approvedAt DESC. Includes the viewer's own vote value if a steamid is provided.

### `getImplementedSuggestions(viewerSteamid?)`

Same but for `status=implemented`.

### `getRejectedSuggestions()`

Returns `status=rejected` suggestions. No vote info needed (voting is disabled on rejected).

### `getPendingSuggestions()`

Creator-only inbox: `status=submitted`, ordered by `createdAt DESC`.
