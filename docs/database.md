# Database Schema

ORM: Drizzle (`drizzle-orm/neon-http`)
Driver: Neon serverless HTTP (no transactions — see constraints section)
Single source of truth: `lib/db/schema.ts`
Migrations: `drizzle/` directory, apply with `npm run db:migrate`

---

## Enums / Constants

```ts
CREATION_KINDS    = blueprint | mod | world | challenge | tile | custom_game | terrain_asset | other
CREATION_STATUSES = pending | approved | rejected | archived | deleted
TAG_SOURCES       = keyword | steam | admin | community
USER_ROLES        = user | moderator | elite_moderator | creator
REPORT_REASONS    = wrong_tags | poor_quality | spam | not_scrap_mechanic | missing_creators | other
SUGGESTION_STATUSES = submitted | approved | rejected | implemented
```

---

## Tables

### `creations`

Main content table. One row per Steam Workshop item.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Steam `publishedfileid` |
| `shortId` | integer UNIQUE, nullable | User-facing numeric ID (used in `/creation/[id]` URLs). Assigned on first approval via `nextval('creations_short_id_seq')`; pending/rejected rows carry NULL so inserts don't burn sequence numbers. The sequence object itself predates V8.12 and is still the source of truth — approval uses `COALESCE(short_id, nextval(...))` so archive↔restore preserves the ID. |
| `title` | text | |
| `descriptionRaw` | text | Original Steam BBCode markup |
| `descriptionClean` | text | Stripped version; feeds the tagger + `searchVector` |
| `authorSteamid` | text | |
| `authorName` | text | Resolved from Steam at ingest time |
| `thumbnailUrl` | text | Hotlinked from Steam CDN |
| `steamUrl` | text | Full URL to Workshop page |
| `fileSizeBytes` | bigint | |
| `timeCreated` | timestamptz | Steam's original creation date |
| `timeUpdated` | timestamptz | Last Steam update |
| `ingestedAt` | timestamptz | When we first saw it |
| `reviewedAt` | timestamptz | When admin triaged it |
| `approvedAt` | timestamptz | When it went public (drives "Newest" feed ordering) |
| `voteScore` | real | Steam's 0–1 weighted score |
| `votesUp` | int | |
| `votesDown` | int | |
| `subscriptions` | int | Workshop subscribe count |
| `favorites` | int | |
| `views` | int | |
| `steamTags` | jsonb | Raw tag array from Steam |
| `kind` | text | One of CREATION_KINDS |
| `status` | text | One of CREATION_STATUSES |
| `uploadedByUserId` | text NULL | Set when a community member submitted the item |
| `reviewedByUserId` | text NULL | Admin who approved/rejected |
| `siteWeightedUp` | int | Denormalized from creationVotes (avoids GROUP BY on cards) |
| `siteWeightedDown` | int | Same |
| `searchVector` | tsvector | `GENERATED ALWAYS AS (to_tsvector('english', title \|\| ' ' \|\| descriptionClean)) STORED`. Postgres maintains it automatically on every insert/update — the ingest pipeline never touches it. |

**Indexes:** `status`, `kind`, `approvedAt DESC`, `timeUpdated`, `authorSteamid`, `GIN(searchVector)`

**Status lifecycle:**
```
pending ──► approved ──► archived ──► approved (restore)
        └──► rejected
approved ──► deleted  (permanent, never re-ingested)
```

---

### `users`

One row per Steam account that has ever logged in.

| Column | Type | Notes |
|---|---|---|
| `steamid` | text PK | |
| `shortId` | serial | Internal numeric ID |
| `personaName` | text | |
| `avatarUrl` | text | |
| `profileUrl` | text | |
| `smPlaytimeMinutes` | int NULL | Null = private Steam profile |
| `siteJoinedAt` | timestamptz | First login |
| `lastSeenAt` | timestamptz | Bumped by `getCurrentUser()` at most once per minute; powers the footer's "online now" counter. Indexed by `users_last_seen_idx`. |
| `steamCreatedAt` | timestamptz NULL | Steam account age — enforces 7-day gate on submissions |
| `role` | text | One of USER_ROLES (default `user`) |
| `bannedUntil` | timestamptz NULL | Temporary or perma ban (9999-12-31 = permanent) |
| `banReason` | text NULL | |
| `hardBanned` | boolean | Nuclear ban — blocks sign-in entirely, see auth docs |
| `mutedUntil` | timestamptz NULL | |
| `muteReason` | text NULL | |
| `warningsCount` | int | |
| `warningNote` | text NULL | Latest warning message |
| `bypassAgeGate` | boolean | Creator / appeal-granter override — user skips the 7-day Steam account-age gate. Flipped by `setAgeGateBypass` (creator, in `/admin/users`) and `grantAgeGateAppeal` (mod+, via the appeals queue). |
| `ageGateAppealHandledAt` | timestamptz NULL | Set when a mod grants or dismisses an age-gate appeal. Drives the `/admin/appeals` filter: the queue only shows users whose latest appeal was submitted after this timestamp (or whose timestamp is null). |
| `moderatorSinceAt` | timestamptz NULL | Stamped the first time `setUserRole` promotes a user to moderator-or-higher. Preserved across demotions — if the same user is later demoted and re-promoted, the original date stands. Display on `/profile/[steamid]` is gated on the user currently being mod+, so demoted users stop seeing the stat even though the column keeps the history. Migration 0033 backfills from the earliest `user.setRole` audit entry whose `metadata.to ∈ mod+`, falling back to `siteJoinedAt` for the Creator and any pre-V9.1 grants. |
| `profileRefreshedAt` | timestamptz NULL | Last time `getCurrentUser` re-pulled this user's Steam profile (persona name, avatar, playtime) from the Steam Web API. Refresh fires when the value is null or older than 10 minutes — catches Steam renames without requiring a sign-out/sign-in dance. Null until the first post-signup request in V9.7+. See `auth.md` for the refresh semantics. |

---

### `deploy_announcements`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `scheduledAt` | timestamptz | Moment the banner's countdown hits zero — typically `now() + 60s` when `scripts/deploy.ts` inserts the row. |
| `createdAt` | timestamptz | Defaults to `now()`. Preserved so the table doubles as a deploy log. |
| `completedAt` | timestamptz NULL | Stamped by `scripts/complete-deploy.ts` at the end of the Vercel build. While null the banner shows "Deploying now…" indefinitely — we can't guess when a rolling deploy actually goes live from inside the old bundle, so we wait for the new build to signal completion. Once set, clients auto-reload (once per announcement, tracked via sessionStorage). |

**Indexes:** `scheduled_at DESC` (fast lookup of the latest active row).

Written by `scripts/deploy.ts` (invoked via `npm run deploy`) 60 seconds before pushing. Updated with `completedAt` by `scripts/complete-deploy.ts` at the end of the Vercel build. Read by `getActiveDeployAnnouncement()` — keeps rows "active" while uncompleted, plus a 2-minute tail after completion so laggy clients still see the completed state and reload. Rows are never deleted.

**Indexes:** `role`, `bannedUntil`

---

### `categories`

Top-level tag buckets (e.g. Vehicle, Building, Mechanism).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text UNIQUE | |
| `name` | text | |
| `description` | text | |
| `createdByUserId` | text NULL | V9.1+. Who originally created this category. Not an FK (so deleting a user doesn't wipe the column); pre-V9.1 rows are null. |
| `createdAt` | timestamptz | V9.1+. DEFAULT now(). |

---

### `tags`

Leaf-level tags (e.g. car, house, cannon, walker).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text UNIQUE | URL-safe, lowercase-hyphen |
| `name` | text | Display name |
| `categoryId` | int NULL → categories | Parent category |
| `createdByUserId` | text NULL | V9.1+. Stamped on insert only — upsert on same slug leaves this untouched. |
| `createdAt` | timestamptz | V9.1+. DEFAULT now(). |

**Index:** `categoryId`

---

### `creationTags`

Many-to-many between creations and tags. Also stores voting metadata.

| Column | Type | Notes |
|---|---|---|
| `creationId` | text → creations | |
| `tagId` | int → tags | |
| `source` | text | `keyword` \| `steam` \| `admin` \| `community` |
| `confidence` | real NULL | Classifier's 0–1 score (keyword source only) |
| `confirmed` | boolean | True = admin confirmed, visible publicly |
| `rejected` | boolean | True = creator forcibly removed, never re-surfaces |

**Composite PK:** `(creationId, tagId)`
**Index:** `(tagId, creationId)`

**Visibility rules:**
- `confirmed=true, rejected=false` → always shown
- `confirmed=false, rejected=false` → shown if community votes net ≥ 3 upvotes
- `rejected=true` → never shown, community votes have no effect

---

### `creationCategories`

Denormalized many-to-many for fast category filtering (derived from `tags.categoryId`).

| Column | Type |
|---|---|
| `creationId` | text → creations |
| `categoryId` | int → categories |

**Composite PK:** `(creationId, categoryId)`

---

### `tagVotes`

Community votes on whether a tag applies to a creation.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid | |
| `creationId` | text → creations | |
| `tagId` | int → tags | |
| `value` | int | +1 or -1 |
| `createdAt` | timestamptz | |

**Composite PK:** `(userId, creationId, tagId)`
**Index:** `(creationId, tagId)`

---

### `creationVotes`

Up/down votes on creations themselves.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid | |
| `creationId` | text → creations | |
| `value` | int | +1 or -1 |

**Composite PK:** `(userId, creationId)`
**Index:** `creationId`

---

### `favorites`

User bookmarks on creations.

| Column | Type |
|---|---|
| `userId` | text → users.steamid |
| `creationId` | text → creations |
| `createdAt` | timestamptz |

**Composite PK:** `(userId, creationId)`
**Index:** `userId`

---

### `creationViews`

Per-user view tracking (for dedup + analytics).

| Column | Type |
|---|---|
| `userId` | text → users.steamid |
| `creationId` | text → creations |
| `firstViewedAt` | timestamptz |
| `lastViewedAt` | timestamptz |

**Composite PK:** `(userId, creationId)`

---

### `reports`

Moderation reports submitted by community members or auto-created by the system. Targets either a creation or a comment (exactly one).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `creationId` | text NULL → creations | One of creationId / commentId must be set (CHECK `reports_target_xor`). |
| `commentId` | int NULL → comments | Comment-targeted report. |
| `reporterUserId` | text NULL | Null for auto-reports |
| `reason` | text | One of REPORT_REASONS |
| `customText` | text NULL | |
| `status` | text | `open` \| `cleared` \| `actioned` |
| `source` | text | `user` \| `auto` |
| `resolverUserId` | text NULL | Who resolved it |
| `resolverNote` | text NULL | |
| `resolvedAt` | timestamptz NULL | |

**Indexes:** `status`, `(creationId, status)`, `commentId`

---

### `comments`

Comments on creations **or** user profiles (exactly one target). Threaded up to 3 levels deep via `parentId`.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `creationId` | text NULL → creations | One of creationId / profileSteamid must be set (CHECK `comments_target_xor`). |
| `profileSteamid` | text NULL → users.steamid | Profile wall target. |
| `userId` | text → users.steamid | The comment author. |
| `parentId` | int NULL | Self-reference to parent comment; not a FK to keep drizzle-kit happy. Depth enforced in `postComment`. |
| `body` | text | |
| `createdAt` | timestamptz | |
| `editedAt` | timestamptz NULL | |
| `deletedAt` | timestamptz NULL | Soft delete |
| `deletedByUserId` | text NULL | Who deleted it |
| `votesUp` | int NOT NULL default 0 | Denorm of commentVotes > 0 |
| `votesDown` | int NOT NULL default 0 | Denorm of commentVotes < 0 |

---

### `badgeAutogrants`

Allowlist of `(slug, steamid)` pairs that should receive the badge
automatically at sign-in. Intentionally no FK to `users.steamid` — the
creator can pre-load influencers before they've signed in.

| Column | Type | Notes |
|---|---|---|
| `slug` | text | Must match a key in `BADGES` marked as auto-grantable |
| `steamid` | text | Raw Steam64 |
| `label` | text NULL | Creator-provided note shown in the admin UI |
| `addedAt` | timestamptz | |
| `addedByUserId` | text NULL → users.steamid | Null for system-seeded rows |

**PK:** `(slug, steamid)`
**Indexes:** `steamid`

---

### `userBadges`

Per-user grants of badges. Badge definitions (slug → name/icon/pill) live
in `lib/badges/definitions.ts`, not this table.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid | |
| `badgeSlug` | text | One of the slugs in `BADGES` |
| `grantedAt` | timestamptz | |
| `grantedByUserId` | text NULL → users.steamid | Null = auto-granted by the system (e.g. betatester) |
| `note` | text NULL | Optional moderator note (≤ 200 chars) |

**PK:** `(userId, badgeSlug)`
**Indexes:** `badgeSlug`

**Auto-managed slugs (V9.1+):** `SYSTEM_AUTO_BADGES` in `lib/badges/definitions.ts` lists badges the system rewrites itself (`top_creator` plus the eight per-kind siblings `top_creator_blueprint` / `_mod` / `_world` / `_challenge` / `_tile` / `_custom_game` / `_terrain_asset` / `_other` added in V9.9). Manual grant UI is hidden for these and `grantBadgeAction` refuses them with `badge_system_auto_managed`. `refreshAllTopCreatorBadges()` in `lib/badges/top-creator.ts` is the single entry point that recomputes the overall crown + every per-kind sibling; it runs from every server action that can shift an approved count (approve, quick-approve, archive, restore, delete, admin-add auto-approve, `setCreationKind`, re-scrape creators).

---

### `modActions` (V9.1+)

Audit log for every non-trivial admin server action. One row per action. See `docs/admin.md` for the full action vocabulary.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `actorUserId` | text NULL → users.steamid (set null) | FK survives user deletion |
| `actorName` | text NULL | Persona snapshot at action time (stays legible when the actor renames) |
| `action` | text | `<noun>.<verb>` — stable vocabulary |
| `targetType` | text NULL | `creation` / `tag` / `category` / `user` / `report` / `comment` / null for ingest-level |
| `targetId` | text NULL | Steam publishedfileid / tag id / steamid / etc. |
| `summary` | text NULL | Pre-formatted one-line English description for the feed UI |
| `metadata` | jsonb NULL | Reason / prior value / count / anything actionable for triage |
| `createdAt` | timestamptz | DEFAULT now() |

**Indexes:** `createdAt DESC`, `actorUserId`, `action`, `(targetType, targetId)`

**Writes:** `logModAction()` in `lib/audit/log.ts` — try/catch-wrapped so audit-write failure never rolls back the underlying mod action.
**Reads:** `/admin/audit` (mod+ visible) with filters for actor, action, and `type:id` target.

---

### `commentVotes`

Up/down votes on individual comments. Mirrors `creationVotes` shape.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid | |
| `commentId` | int → comments.id | |
| `value` | int | `+1` or `-1`; `0` deletes the row |
| `createdAt` | timestamptz | |

**PK:** `(userId, commentId)`
**Indexes:** `commentId`

**Indexes:** `creationId`, `userId`

---

### `blockdleDailyResults`

One row per signed-in user per UTC day — drives both Blockdle leaderboards (today's + all-time). Only written on the first terminal submission (won or lost) for that user+date via `onConflictDoNothing`; anonymous players are never recorded.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid, ON DELETE CASCADE | |
| `dateIsoUtc` | text NOT NULL | `"YYYY-MM-DD"` — the UTC day of the puzzle |
| `guessesUsed` | int NOT NULL | `1..ATTEMPTS_MAX` |
| `won` | boolean NOT NULL | |
| `createdAt` | timestamptz NOT NULL default now() | |

**PK:** `(userId, dateIsoUtc)` — idempotent write, first submission wins
**Indexes:** `dateIsoUtc`

**Queries:**
- `getTodayLeaderboard()` — today's wins, sorted fewest-guesses-first, hard-banned users filtered.
- `getAllTimeLeaderboard()` — GROUP BY user, `wins = COUNT(*) FILTER (WHERE won)`, `avgGuesses = AVG(guesses_used) FILTER (WHERE won)`. `HAVING wins > 0` so loss-only users don't appear. Sorted by wins DESC, avg-guesses ASC.

See [blockdle.md](blockdle.md) for the full flow.

---

### `ingestRuns`

Audit trail for the automated ingest pipeline.

| Column | Type |
|---|---|
| `id` | serial PK |
| `startedAt` | timestamptz |
| `endedAt` | timestamptz NULL |
| `fetched` | int |
| `newItems` | int |
| `errors` | jsonb |

---

### `featureSuggestions`

Community feature request board.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `submitterUserId` | text → users.steamid | |
| `title` | text | Max 120 chars |
| `body` | text | Max 2000 chars |
| `status` | text | One of SUGGESTION_STATUSES |
| `approvedByUserId` | text NULL | |
| `approvedAt` | timestamptz NULL | |
| `implementedAt` | timestamptz NULL | |
| `creatorNote` | text NULL | Shown publicly (creator's explanation) |
| `imageDataUri` | text NULL | Optional base64 data URI attached by submitter (mockup / screenshot / sketch). Capped at ~500 KB binary via the submit action — inline-in-DB instead of an external blob host to stay free-tier. |

**Index:** `status`

---

### `featureSuggestionVotes`

Votes on feature suggestions.

| Column | Type | Notes |
|---|---|---|
| `userId` | text → users.steamid | |
| `suggestionId` | int → featureSuggestions | |
| `value` | int | +1 (upvote) or -1 (downvote); upsert value=0 to delete |

**Composite PK:** `(userId, suggestionId)`

---

## Key Design Decisions

**No transactions (neon-http driver).** Admin actions write sequentially. Small windows of partial state are accepted on failure. Never group writes in a way that requires atomicity.

**Soft delete for creations.** `status=deleted` rows stay in the DB so their `publishedfileid` remains on the ingest blocklist — Steam may re-publish the same ID.

**Hard delete for suggestions.** `deleteSuggestion` removes the row entirely (votes cascade). No audit trail needed here.

**Denormalized vote columns.** `siteWeightedUp/Down` on `creations` avoids GROUP BY on every card render. Updated by server actions when votes change.

**Permanent bans.** `bannedUntil = 9999-12-31` — a distant date keeps all date-comparison code working without special-casing NULL.

**`shortId` as public URL key.** Short, user-friendly IDs (`/creation/42`) without exposing Steam's numeric publishedfileid directly. Both are accepted by the detail page query (`getCreationDetail` tries the integer first, falls back to the steam id). Since V8.12 the column is nullable: rows start with NULL at insert and only receive a sequence value on approval (`approveCreation` / `quickApprove` / `addCreation(autoApprove=true)` call `COALESCE(short_id, nextval(pg_get_serial_sequence('creations', 'short_id')))`). That keeps pending/rejected items off the sequence so visible IDs stay close to the approved catalog count instead of drifting upward over time. Archive → restore preserves the existing number via the COALESCE.
