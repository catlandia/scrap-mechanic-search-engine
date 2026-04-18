# Community Features

All community features require a Steam login. Anonymous visitors can browse and search but cannot interact.

---

## User Roles Summary

| Role | Who | What they can do |
|---|---|---|
| Ghost (null) | Logged-out, or banned | Browse only |
| User | Any logged-in Steam account | Vote, comment, favorite, submit items, suggest features |
| Moderator | Assigned by creator | + Triage, reports, queue, warn |
| Elite Moderator | Assigned by creator | + Archive/restore, mute |
| Creator | `CREATOR_STEAMID` env var | Everything + hard management |

See `docs/auth.md` for the full permissions model.

---

## Comments

Users can comment on any approved creation.

**Location:** `app/creation/[id]/page.tsx` (bottom section), backed by `comments` table.

**Rules:**
- Must be logged in
- Must not be banned (effectiveRole check)
- Must not be muted
- Muted users see a "You are muted" message instead of the comment form

**Soft delete:** Comments are not removed from the DB on deletion. `deletedAt` and `deletedByUserId` are set. Deleted comments show as "[deleted]" in the thread.

**Threading:** `parentId` column is reserved in the schema but threading is not yet implemented in the UI.

---

## Creation Votes

Up/down votes on creations themselves.

- `value = +1` or `value = -1`
- Stored in `creationVotes` table
- Denormalized into `creations.siteWeightedUp` / `siteWeightedDown` for fast card rendering
- Banned/muted users cannot vote
- Used in sort modes: `popular` (net votes), `rating` (ratio)
- Rate-limited to 30 votes / 60 s / user (V5.0). Same limit covers tag votes, favourite toggles, and suggestion votes. No-op if the incoming value matches the existing row.

---

## Tag Votes

Community voting on whether a tag correctly describes a creation.

- Stored in `tagVotes` table with `(userId, creationId, tagId)` PK
- `value = +1` or `value = -1`
- Visibility threshold: net ≥ 3 upvotes → tag becomes publicly visible (if not admin-confirmed). Creator bypasses this threshold and always sees all non-rejected tags with a × remove button.
- Confirmed tags (admin-set) are always visible regardless of vote count
- Rejected tags (`rejected=true`, set by creator) cannot be voted to visible — creator rejection is final
- Role-based vote breakdown shown on creation detail page (how many users / mods / elite / creator voted)
- Banned/muted users cannot vote

---

## Favorites

Users can bookmark creations.

- Stored in `favorites` table
- Accessible at `/me/favourites`
- Muted users cannot add favorites
- Used in sort mode: `favorites` (most favorited)

---

## Workshop Item Submissions

Community members can submit Steam Workshop items for admin review.

**Route:** `/submit`

**Gates:**
- Must be logged in
- Must not be banned
- Must not be muted
- Steam account must be ≥ 7 days old (prevents fresh sock-puppet accounts)
- Item must belong to the Scrap Mechanic Workshop (`consumer_appid === 387990`) — items from other games (and items where Steam omits the field) are rejected. Previously a missing `consumer_appid` was allowed through; tightened in V4.15 so the check now requires an explicit match.

**Flow:**
1. User pastes a Steam Workshop URL or ID
2. System fetches item from Steam API
3. `consumer_appid` is checked; non-SM items return an error immediately
4. Item is inserted with `status='pending'` and `uploadedByUserId` set
5. Tagger runs and suggests tags
6. Admin triages it like any other pending item
7. If approved or rejected, the submitter receives a notification
8. If approved, the creation detail page shows a "Submitted by community" badge crediting the submitter

**Parsing:** Accepts full URLs (`steamcommunity.com/sharedfiles/filedetails/?id=XXX`) or bare numeric IDs.

---

## Feature Suggestion Board

Users can submit and vote on feature requests for the site.

### Submitting (`/suggestions/new`)

**Gates:**
- Must be logged in
- Steam account ≥ 7 days old
- Rate limit: 1 submission per 5 minutes per user

**Fields:**
- Title: max 120 characters
- Body: max 2000 characters

New suggestions start with `status='submitted'` and appear in the admin inbox.

### Public Board (`/suggestions`)

Three tabs:

| Tab | Status | Interactivity |
|---|---|---|
| Approved | `approved` | Voting enabled |
| Implemented | `implemented` | Read-only (voting disabled) |
| Rejected | `rejected` | Read-only |

Each card shows:
- Title and body
- Submitter persona name + role badge
- Submission timestamp
- Vote counts (upvotes, downvotes, net score)
- Creator note (if set — explains status or provides context)

### Voting

- Logged-in, non-banned users can vote on `approved` or `implemented` suggestions
- `value = +1` (upvote), `value = -1` (downvote)
- Upsert with value `0` to un-vote
- Banned/muted users cannot vote

### Status lifecycle

```
submitted
   │
   ├──► approved  ──► implemented
   │         ▲            │
   │         └────────────┘ (can revert to approved)
   │
   └──► rejected  ◄──── approved (can reject from live)
              │
              └──► approved (can revert from rejected)
```

All transitions are available to the creator in `/admin/suggestions`. Hard-delete is creator-only and permanent.

When a suggestion status changes to `approved`, `rejected`, or `implemented`, the original submitter receives a notification automatically.

---

## Notifications

Users receive in-app notifications for events affecting their own content and, for moderators, events affecting their tier of responsibility.

Every notification is tagged with a **tier** — `user`, `moderator`, `elite_moderator`, or `creator` — which drives which coloured bell surfaces it and how it's grouped on `/me/notifications`.

**Tier bells (V5.1):** the header renders one bell per tier the viewer has access to:

| Bell | Colour | Tier | Who sees it |
|---|---|---|---|
| Personal | white / grey | `user` | Everyone signed-in |
| Moderator | sky blue | `moderator` | moderator · elite · creator |
| Elite | amber / gold | `elite_moderator` | elite · creator |
| Creator | purple | `creator` | creator |

Each bell shows its own unread count badge and links to `/me/notifications?tier=<tier>`. Higher tiers inherit lower-tier bells automatically — a creator sees all four stacked.

**Triggers:**

| Tier | Event | Notification |
|---|---|---|
| user | Submission approved | "Submission approved!" |
| user | Submission rejected | "Submission not accepted" (body includes the optional reason typed by the moderator when rejecting, V4.15) |
| user | Idea approved / rejected / implemented | "Idea approved / not accepted / implemented!" |
| moderator | New user report lands | "New report on \"<title>\"" — broadcast to every mod+ except the reporter |
| elite_moderator | Creation archived (from report or manual) | "Creation archived: \"<title>\"" — broadcast to every elite+ except the actor |
| creator | New feature suggestion submitted | "New idea: \"<title>\"" — broadcast to every creator except the submitter |

**Delivery:** Best-effort — notification inserts never block the primary action. If the insert fails, the action succeeds anyway. Broadcasts also skip any user who is time-banned or hard-banned.

**Reading:** `/me/notifications` shows tabs for each tier the viewer has access to. The active tab's unread notifications are marked as read on page load; other tabs retain their badges until visited.

**Per-notification mark-read (V4.15):** The "View →" link on each row points to `/api/notifications/[id]/click`, not directly to the stored link. That route calls `markNotificationRead(userId, id)` (ownership-checked) and 303-redirects to the target. This way a user who arrives from an external prompt and clicks a single notification gets *that* notification cleared even if they never visit `/me/notifications`.

**Schema:** `notifications` table — `id`, `userId`, `type`, `tier`, `title`, `body`, `link`, `read`, `createdAt`. Helpers live in `lib/db/notifications.ts`: `createNotification()` for single-recipient, `broadcastToRole({ minRole, tier, ... })` for fan-out to every user with role ≥ `minRole` (skipping banned users and an optional `excludeUserId`).

---

## My Submissions (`/me/submissions`)

Shows all Workshop items the current user has submitted, ordered newest first. Each row shows:
- Thumbnail, title, kind
- Status badge: Pending review / Approved / Not accepted / Archived / Deleted
- Submission date
- Link to the item's Steam Workshop page
- If approved, the title links to the creation detail page

---

## Tag Nominations

Logged-in users can suggest new tags for an approved creation (community source). These appear in `creationTags` with `source='community'` and `confirmed=false`. Standard tag visibility rules apply (net ≥ 3 votes to become public without admin confirmation).

This lets the community expand the tag coverage beyond what the auto-tagger catches, without requiring an admin to manually review every item.

---

## Rate Limits

Implemented via DB queries (last-write timestamps), not Redis:

| Action | Limit |
|---|---|
| Feature suggestion | 1 per 5 minutes |
| Creation votes | Debounced per creation |
| Tag votes | 1 per (userId, creationId, tagId) — can change vote |

No external rate-limit service is used. These are best-effort guards, not bulletproof.

---

## View Tracking

`creationViews` records per-user first and last view times. Views are recorded server-side when a user loads a creation detail page (before fetching aggregate counts so the viewer sees their own view immediately). Unauthenticated views are not tracked.
