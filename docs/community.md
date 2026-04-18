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

---

## Tag Votes

Community voting on whether a tag correctly describes a creation.

- Stored in `tagVotes` table with `(userId, creationId, tagId)` PK
- `value = +1` or `value = -1`
- Visibility threshold: net ≥ 3 upvotes → tag becomes publicly visible (if not admin-confirmed)
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

**Flow:**
1. User pastes a Steam Workshop URL or ID
2. System fetches item from Steam API
3. Item is inserted with `status='pending'` and `uploadedByUserId` set
4. Tagger runs and suggests tags
5. Admin triages it like any other pending item
6. If approved, the creation detail page shows a "Submitted by community" badge crediting the submitter

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
