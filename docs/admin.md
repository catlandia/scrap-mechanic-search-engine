# Admin System

The admin backend is gated at `/admin/*` by the middleware, requiring a Steam login. Role checks for specific operations happen inside each server action.

---

## Admin Routes

| Route | Access | Purpose |
|---|---|---|
| `/admin/login` | Public | Password login (legacy pre-Steam) |
| `/admin/logout` | Authenticated | Clears session |
| `/admin` | Mod+ | Dashboard overview |
| `/admin/triage` | Mod+ | Review pending items |
| `/admin/queue` | Mod+ | Confirmed-tag queue for approved items |
| `/admin/tags` | Mod+ | Create/manage taxonomy |
| `/admin/ingest` | Mod+ | Ingest run history + manual trigger |
| `/admin/reports` | Mod+ | Community moderation reports |
| `/admin/archive` | Mod+ (view only) | Archived creations |
| `/admin/add` | Mod+ | Manually add a Workshop item by URL |
| `/admin/users` | Creator | User role + ban management |
| `/admin/suggestions` | Creator | Feature suggestion board management |

---

## Triage Queue (`/admin/triage`)

Purpose: review new `status='pending'` items before they go public.

- Shows up to 50 items ordered by `subscriptions DESC` (most popular first = highest confidence they deserve to be included)
- Each card shows: thumbnail, title, Steam metadata (subs, favorites, vote score), kind badge, suggested tags with confidence scores
- **Actions:**
  - **Approve** — sets `status=approved`, `approvedAt=now()`, confirms selected tags (sets `confirmed=true`)
  - **Reject** — sets `status=rejected`. The form includes an optional `reason` text input (max 300 chars); if filled, it's appended to the submitter's rejection notification body (`"<title>" was not accepted. Reason: <reason>`).
  - **Quick Approve** — fast-path, skips manual tag confirmation; suggested tags stay `confirmed=false` for community voting to decide

---

## Tag Queue (`/admin/queue`)

Purpose: catch approved items that still have no publicly visible tags.

- Shows approved creations with no admin-confirmed (non-rejected) tags AND fewer than 3 net community upvotes on any tag
- Limit 30, ordered by `approvedAt DESC`
- Lets admin confirm or dismiss tag suggestions after the fact

---

## Reports Queue (`/admin/reports`)

Community-submitted reports about creations (wrong tags, spam, etc.).

- Status flow: `open` → `cleared` (no action taken) | `actioned` (creation removed/archived)
- `archiveFromReport` action: archives the creation AND actions the report in one step
- Clearing a report does not affect the creation's status

---

## Server Actions (`app/admin/actions.ts`)

### Permission hierarchy

```
requireMod()       → moderator, elite_moderator, creator
requireEliteMod()  → elite_moderator, creator
requireCreator()   → creator only
```

All helpers check `effectiveRole` (ban-aware), not `user.role` directly. **Every admin server action calls `requireMod/Elite/Creator` as its first statement** — the layout-level gate at `/admin/(gated)` is not sufficient, because server actions can be invoked from any page that imports them.

### Creation management

| Action | Permission | Notes |
|---|---|---|
| `approveCreation(id, kind, tagIds)` | Mod+ | Sets approved, confirms selected tags |
| `quickApprove(id)` | Mod+ | Approves without tag confirmation |
| `rejectCreation(id)` | Mod+ | Marks rejected |
| `saveCreationTags(id, kind, tagIds)` | Mod+ | Update kind + tag set without approving |
| `removeCreationTag(creationId, tagId)` | Creator | Sets `rejected=true` on tag row |
| `archiveCreation(id)` | Elite+ | Moves to archived, auto-creates audit report |
| `restoreFromArchive(id)` | Elite+ | Returns to approved, clears actioned reports |
| `archiveFromReport(id, reportId)` | Elite+ | Archive + action the triggering report |
| `deleteCreation(id)` | Creator | Permanent `status=deleted`, clears reports |

### User management (Creator-only)

| Action | Notes |
|---|---|
| `setUserRole(steamid, role)` | Assigns mod/elite. Cannot set creator via UI. Cannot modify self. |
| `banUser(steamid, durationDays \| "perma")` | Temporary or permanent ban |
| `clearBan(steamid)` | Lifts ban |
| `muteUser(steamid, durationDays \| "perma")` | Elite+ required. Blocks votes/comments/reports/favorites |
| `clearMute(steamid)` | Lifts mute |
| `warnUser(steamid, note)` | Increments `warningsCount`, records note. Visible to mod+. |
| `clearWarnings(steamid)` | Resets `warningsCount` to 0 and clears `warningNote`. Creator-only. |
| `hardBanUser(steamid)` | Sets `hardBanned=true`. Blocks future sign-ins. Existing sessions die immediately. |
| `clearHardBan(steamid)` | Wipes hard ban + ban reason |

### Tags

| Action | Notes |
|---|---|
| `createTag(name, slug, categoryId)` | Normalizes slug, upserts to avoid duplicate errors |
| `createCategory(name, slug)` | Creates a new category |

### Ingest

| Action | Notes |
|---|---|
| `triggerIngest(pagesPerKind?)` | Manual ingest run. Default 1 page; max 20. |
| `addCreation(urlOrId, autoApprove?)` | Manual item add by Steam URL or ID |

---

## Users Page (`/admin/users`)

Creator-only. Shows all users grouped by role.

For each user:
- Avatar, persona name, Steam join date, site join date
- Current role (with badge)
- Warning count + note
- Ban status (with expiry)
- Mute status (with expiry)
- Hard-ban indicator
- Action buttons based on caller's role:
  - **Creator sees:** Full role management, ban/clear, hard-ban/clear, mute/clear, warn, **clear warnings**
  - **Elite mod sees:** Mute/clear, warn (no role management)
  - **Mod sees:** Warn only

"Clear warnings" only appears when the target user has at least one warning — it resets `warningsCount` to 0 and wipes the note.

---

## Suggestions Admin (`/admin/suggestions`)

Creator-only. Four sections with corresponding status transitions:

| Section | Status | Available transitions |
|---|---|---|
| Inbox | `submitted` | Approve → `approved`, Reject → `rejected` |
| Live board | `approved` | Mark implemented → `implemented`, Reject → `rejected` |
| Implemented | `implemented` | Back to approved → `approved`, Reject → `rejected` |
| Rejected | `rejected` | Back to approved → `approved` |

Every card also has:
- **Creator note field** — inline editable, shown publicly on the Ideas board
- **Hard delete** (🗑) — completely removes the row and cascades votes; no undo

---

## Archive

`/admin/archive` is **strictly view-only** for mods. Elite mods and the creator can restore from this page. Regular mods cannot.

Archived creations are not visible on the public site but their data is preserved.
