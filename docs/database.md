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
REPORT_REASONS    = wrong_tags | poor_quality | spam | not_scrap_mechanic | other
SUGGESTION_STATUSES = submitted | approved | rejected | implemented
```

---

## Tables

### `creations`

Main content table. One row per Steam Workshop item.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Steam `publishedfileid` |
| `shortId` | serial UNIQUE | User-facing numeric ID (used in `/creation/[id]` URLs) |
| `title` | text | |
| `descriptionRaw` | text | Original Steam BBCode markup |
| `descriptionClean` | text | Stripped version; used for tagger + ILIKE search |
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

**Indexes:** `status`, `kind`, `approvedAt DESC`, `timeUpdated`, `authorSteamid`

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
| `lastSeenAt` | timestamptz | Updated on every session resolution |
| `steamCreatedAt` | timestamptz NULL | Steam account age — enforces 7-day gate on submissions |
| `role` | text | One of USER_ROLES (default `user`) |
| `bannedUntil` | timestamptz NULL | Temporary or perma ban (9999-12-31 = permanent) |
| `banReason` | text NULL | |
| `hardBanned` | boolean | Nuclear ban — blocks sign-in entirely, see auth docs |
| `mutedUntil` | timestamptz NULL | |
| `muteReason` | text NULL | |
| `warningsCount` | int | |
| `warningNote` | text NULL | Latest warning message |

**Indexes:** `role`, `bannedUntil`

---

### `categories`

Top-level tag buckets (e.g. Vehicle, Building, Mechanism).

| Column | Type |
|---|---|
| `id` | serial PK |
| `slug` | text UNIQUE |
| `name` | text |
| `description` | text |

---

### `tags`

Leaf-level tags (e.g. car, house, cannon, walker).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text UNIQUE | URL-safe, lowercase-hyphen |
| `name` | text | Display name |
| `categoryId` | int NULL → categories | Parent category |

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

Moderation reports submitted by community members or auto-created by the system.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `creationId` | text → creations | |
| `reporterUserId` | text NULL | Null for auto-reports |
| `reason` | text | One of REPORT_REASONS |
| `customText` | text NULL | |
| `status` | text | `open` \| `cleared` \| `actioned` |
| `source` | text | `user` \| `auto` |
| `resolverUserId` | text NULL | Who resolved it |
| `resolverNote` | text NULL | |
| `resolvedAt` | timestamptz NULL | |

**Indexes:** `status`, `(creationId, status)`

---

### `comments`

Comments on creations. `parentId` reserved for future threading.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `creationId` | text → creations | |
| `userId` | text → users.steamid | |
| `parentId` | int NULL | Reserved (threading not yet implemented) |
| `body` | text | |
| `createdAt` | timestamptz | |
| `editedAt` | timestamptz NULL | |
| `deletedAt` | timestamptz NULL | Soft delete |
| `deletedByUserId` | text NULL | Who deleted it |

**Indexes:** `creationId`, `userId`

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

**`shortId` as public URL key.** The serial auto-increment gives short, user-friendly IDs (`/creation/42`) without exposing Steam's numeric publishedfileid directly. Both are accepted by the detail page query.
