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
6. For **new rows only**, also scrapes the Workshop page HTML for multi-creator attribution via `fetchWorkshopContributors` (3-at-a-time concurrency). Steam's API returns one primary creator, but the rendered page often lists 2–10 contributors — those go into `creations.creators jsonb`. The scraper retries once on transient failures (~500ms backoff). Items that still fail are left with an empty array and picked up by the weekly refresh cron (`refreshMissingCreators`, up to 50 per run).
7. Upserts into `creations` with `status='pending'`.
8. For **new rows only**, runs the tagger and inserts `creationTags` rows with `confirmed=false`. Existing tag rows are left untouched so admin confirmations survive re-ingest.
9. Writes an `ingestRuns` row with counts and any errors.

### Options

```ts
runIngest({
  kinds?: SteamKind[],        // default: ALL_KINDS
  pagesPerKind?: number,      // default: 1 (cron); up to 20 (manual trigger)
  numPerPage?: number,        // default: 50
})
```

### Manual trigger

The admin can trigger ingest from `/admin/ingest` with an optional `pagesPerKind` override (1–20). This is useful for deep-scanning after a gap or when seeding a fresh database.

---

## Follow-Count Gate (`lib/ingest/thresholds.ts`)

Items must meet both conditions for their kind to pass the gate:

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

**What gets updated:** `subscriptions`, `favorites`, `views`, `voteScore`, `votesUp`, `votesDown`

**What does NOT trigger a re-triage:** Refresh never changes a creation's `status`. Even if an approved item's subscription count drops below the threshold, it stays approved. (Down-the-road: surface a "might want to re-review" flag for admins.)

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

**`detectKind(steamTags[])`** — infers `kind` from the Steam tags on an item.

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
