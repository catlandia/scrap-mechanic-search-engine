# Ingest Pipeline

The ingest system is responsible for discovering new Workshop items on Steam and loading them into the database for admin review.

---

## Cron Schedule (`vercel.json`)

| Job | Path | Schedule | Purpose |
|---|---|---|---|
| Ingest | `/api/cron/ingest` | `0 6 * * *` | Daily at 6 AM UTC — fetch new items |
| Refresh | `/api/cron/refresh` | `0 3 * * 1` | Mondays at 3 AM UTC — update engagement metrics |

Both endpoints check `Authorization: Bearer <CRON_SECRET>` before running.

---

## Ingest Pipeline (`lib/ingest/pipeline.ts`)

### What it does

1. For each Workshop `kind` (blueprint, mod, world, challenge, tile, custom_game, terrain_asset), calls Steam's `QueryFiles` endpoint sorted by trending, fetching `numPerPage` items per page for `pagesPerKind` pages.
2. De-duplicates results across kind queries (a single Steam item can match multiple kind tags in edge cases).
3. Checks each item against the **follow-count gate** (`passesFollowGate`) — items below the threshold for their kind are silently skipped.
4. Skips items that already have a decided status (`approved`, `rejected`, `archived`, `deleted`) to save Steam API quota.
5. Resolves author display names in batches via `ISteamUser/GetPlayerSummaries`.
6. For **new rows only**, also scrapes the Workshop page HTML for multi-creator attribution via `fetchWorkshopContributors` (3-at-a-time concurrency). Steam's API returns one primary creator, but the rendered page often lists 2–10 contributors — those go into `creations.creators jsonb`. The scraper retries up to 3 times with jittered 400–800 ms backoff and returns a tagged result: `{ ok: true, contributors: [...] }` distinguishes "scrape succeeded, genuinely solo item" (empty array) from `{ ok: false, reason: "fetch" | "parse" }` (transient failure or Steam HTML drift). Insert-path callers treat failure as empty because they have nothing to preserve; the refresh cron (`refreshStaleCreators`, up to 200 rows / week) PRESERVES prior `creators` and `creatorsRefreshedAt` on `ok: false`, so a transient hiccup doesn't clobber real attribution and the row retries first next cycle. Admins can force an on-demand re-scrape from the creation detail page via `rescrapeCreatorsAction`.
7. Upserts into `creations` with `status='pending'`.
8. For **new rows only**, runs the tagger and inserts `creationTags` rows with `confirmed=false`. Existing tag rows are left untouched so admin confirmations survive re-ingest.
9. Writes an `ingestRuns` row with counts and any errors.

### Options

```ts
runIngest({
  kinds?: SteamKind[],             // default: ALL_KINDS
  pagesPerKind?: number,           // default: 5 — hard page ceiling per kind
  numPerPage?: number,             // default: 50
  minNewPerKind?: number,          // default: 0 (no early stop). When > 0,
                                   // stop paging a kind once this many
                                   // novel-for-us items are collected.
  order?: "trend" | "new",         // default: "trend" — RankedByTrend vs
                                   // RankedByPublicationDate
  skipAgeGate?: boolean,           // default: false. When true,
                                   // passesFollowGate ignores minAgeDays
                                   // but still enforces minSubscriptions
                                   // and the banned flag. Manual admin
                                   // runs pass true.
})
```

### Manual trigger

The admin can trigger ingest from `/admin/ingest` with three controls:

- **Order** — `Best (trending)` or `Newest`. Picks the Steam ranking the
  pipeline pages through. Newest is useful when the trending list is
  dominated by already-triaged items and we want the freshest uploads
  regardless of popularity.
- **Pages per kind** — upper page ceiling per kind (1–50). Defaults to
  20. High ceiling matters because `minNewPerKind` is the real stop
  condition — a saturated trending top will have 250+ already-decided
  items before a genuinely new one appears, and the page count is
  what prevents unbounded paging in pathological cases.
- **Kinds** — checkboxes for each SteamKind. Unticking a box excludes that
  kind from the run entirely; leaving all ticked means "everything".

Manual runs pass `minNewPerKind = 50` so already-decided items don't burn
the page budget — the pipeline keeps paging past them until it finds a
fresh page worth of novel items per kind (bounded by `pagesPerKind`).

Manual runs also pass `skipAgeGate = true`. The cron keeps the age floor
because its job is to filter vote-farmable items before they reach triage
at all; a manual run with `order = new` explicitly wants recent uploads,
and the admin is triaging everything anyway so the floor is counter-
productive. Without this flag, `order = new` returned almost nothing —
the newest slice of the Workshop is by definition under the 3–7 day
floor, and every item failed the gate.

The form selection (order / pages / kinds) is persisted to the
`smse_ingest_prefs` cookie by the server action so each run starts with
the moderator's last-used choices instead of snapping back to defaults.

---

## Follow-Count Gate (`lib/ingest/thresholds.ts`)

Items must meet both conditions for their kind to pass the gate (unless
`skipAgeGate` is set — see below):

| Kind | Min Subscriptions | Min Age (days) |
|---|---|---|
| blueprint | 500 | 7 |
| mod | 100 | 3 |
| world | 150 | 5 |
| challenge | 100 | 3 |
| tile | 75 | 3 |
| custom_game | 100 | 3 |
| terrain_asset | 50 | 3 |

**Rationale:** Blueprints have the highest bar because there are far more of them and quality varies widely. Terrain assets have the lowest bar because fewer are published overall. Age requirement prevents vote-farming on very new items.

These thresholds are tunable — edit `thresholds.ts` and redeploy. No DB migration needed.

---

## Refresh (`lib/ingest/refresh.ts`)

Runs weekly (Mondays) to sync engagement metrics for already-approved creations. Uses `GetPublishedFileDetails` in batches of 100.

**What gets updated:** `subscriptions`, `favorites`, `views`, `voteScore`, `votesUp`, `votesDown`, plus `descriptionRaw` + `descriptionClean` (whenever Steam returns a non-empty body — `pickFullDescription` picks the richest of `file_description` / `description` / `short_description`). Writing the description on every rotation self-heals rows that were ingested with the pre-V8.18 `return_short_description=true` flag and therefore only stored the 250-char preview.

**What does NOT trigger a re-triage:** Refresh never changes a creation's `status`. Even if an approved item's subscription count drops below the threshold, it stays approved. (Down-the-road: surface a "might want to re-review" flag for admins.)

**Multi-creator attribution drain.** The weekly refresh cron also runs `refreshStaleCreators(500)` and the daily ingest cron tops it up with `refreshStaleCreators(200)` — combined weekly throughput ≈ 1900 rows. Rotation is ordered by `creators_refreshed_at asc nulls first`, so never-scraped and longest-stale rows land first. This is what pulls historical rows scraped by pre-V8.8 parsers (which silently overwrote real attribution with `[]` on transient failure) back into a clean state. On scrape failure the row's prior state and timestamp are preserved so hiccups don't clobber good data.

---

## Steam Web API Client (`lib/steam/client.ts`)

App ID: **387990** (Scrap Mechanic)

### Endpoints Used

**`IPublishedFileService/QueryFiles/v1`** (`queryFiles`)
- Discovery: paginated scan of Workshop items
- Sorted by trend (`query_type=21`)
- Filters by required Steam tag (e.g., `requiredtags=Blueprint`)
- No API key needed for basic queries
- Returns: items array, next cursor, total count
- **`return_short_description=false`**: we want the full BBCode body back in `file_description`, not the 250-char preview. With this flag flipped to `true` (the pre-V8.18 default) Steam leaves `file_description` empty and only populates `short_description` — every ingested row that way carried a truncated description.

**`pickFullDescription(item)`** — the two Steam endpoints populate the description field inconsistently: `IPublishedFileService` uses `file_description` or `short_description` depending on the request flag, `ISteamRemoteStorage` uses a plain `description`. This helper returns the richest non-empty body so callers don't have to track which endpoint produced the row. Ingest, admin-add, community-submit, and the weekly refresh all go through it.

**`ISteamRemoteStorage/GetPublishedFileDetails/v1`** (`getPublishedFileDetails`)
- Batch-fetch full metadata for known publishedfileids
- Used by the weekly refresh cron and for manual admin adds

**`ISteamUser/GetPlayerSummaries/v2`** (`resolvePlayerNames`)
- Resolves SteamIDs → persona names in batches of 100
- Used during ingest to populate `authorName`

**`ISteamUser/GetPlayerSummaries/v2`** (`getPlayerSummary`)
- Single user profile lookup
- Used when a user first logs in to populate their row

**`IPlayerService/GetOwnedGames/v1`** (`getSmPlaytimeMinutes`)
- Returns Scrap Mechanic playtime for a Steam user
- Returns null if profile is private

**`steamUrlFor(publishedFileId)`** — constructs a Workshop item URL.

**`detectKind(steamTags[])`** — infers `kind` from the Steam tags on an item. Items without any of the mapped kind tags below fall through to **`mod`** (not `"other"`) — almost every untaggable item has turned out to be a miscategorised mod, so landing them in a section a visitor actually browses beats dumping them in an orphan bucket. The creator can reclassify a specific item from its detail page via `setCreationKind` if the heuristic is wrong.

### Steam Kind → Internal Kind Mapping

| Steam Tag | Internal `kind` |
|---|---|
| Blueprint | blueprint |
| Mod | mod |
| World | world |
| Challenge Pack | challenge |
| Tile | tile |
| Custom Game | custom_game |
| Terrain Assets | terrain_asset |
| *(no match)* | other |

---

## BBCode Stripper (`lib/steam/bbcode.ts`)

Steam workshop descriptions use a custom BBCode dialect. `descriptionClean` strips this for use in the tagger and ILIKE text search.

**What gets stripped:**
- Media: `[img]`, `[video]`, `[previewyoutube]`
- URL labels: `[url=X]label[/url]` → `label`
- Inline markup: `[b]`, `[i]`, `[u]`, `[s]`, `[h1]`–`[h3]`, `[code]`, `[spoiler]`
- Lists: `[list]`, `[*]`
- Quotes: `[quote]...[/quote]` → inner text extracted
- HTML entities: `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`

Output is normalized: collapsed whitespace, trimmed, no blank lines.

---

## Manual Item Add (`app/admin/actions.ts` → `addCreation`)

Admins can bypass the cron and ingest gate to manually add a specific item by Steam URL or numeric ID.

**Flow:**
1. Parse the URL or raw ID (supports `steamcommunity.com/sharedfiles/filedetails/?id=XXX` format)
2. Fetch via `getPublishedFileDetails`
3. Run BBCode stripper + tagger
4. Upsert to DB
5. Optionally auto-approve (tags auto-confirmed if approving)

This is the escape hatch for items that don't meet the follow-count threshold but the admin wants to include anyway.
