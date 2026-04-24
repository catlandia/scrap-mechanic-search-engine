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
| `/admin/tags` | Mod+ | Create/manage taxonomy (creator + created_at stamped since V9.1) |
| `/admin/audit` | Creator | Mod action audit log (V9.1+, Creator-only since V9.3). Filter by actor/action/target; paged 50 rows. |
| `/admin/ingest` | Creator | Ingest run history + manual trigger. Creator-only since V9.0 — manual runs burn Steam API quota and can reshape the catalogue wholesale. |
| `/admin/reports` | Mod+ | Community moderation reports |
| `/admin/archive` | Mod+ (view only) | Archived creations |
| `/admin/add` | Moderator+ | Manually add a Workshop item by URL. Opened to mods/elite mods in V9.18 (was Creator-only V9.0–V9.17) so the whole mod tier can pull in small gems the cron wouldn't grab on its own. Bypasses the follower-count floor. |
| `/admin/users` | Creator | User role + ban management |
| `/admin/appeals` | Mod+ | Age-gate appeal queue — grant or dismiss appeals submitted via `/verify/appeal` |
| `/admin/suggestions` | Creator | Feature suggestion board management |
| `/admin/guide` | Mod+ | In-app moderator handbook. Sections are tier-gated — a regular mod only sees moderator-tier content, an elite sees mod+elite, the creator sees everything. |
| `/admin/abuse` | Creator | Throwaway-command sandbox (V9.10+). First entry: **Fake reboot** — inserts an `is_prank=true` row into `deploy_announcements` so every **Fun-Mode-enabled** visitor sees the 60s countdown + SFX, then at zero the banner swaps to "just kidding :^)" and self-hides 10s later. Fun-Mode-off visitors see nothing for prank rows. No build, no reload. Not audited. Creator-only on purpose: this is the Creator's personal prank surface and mods shouldn't be able to fire it. |

---

## Triage Queue (`/admin/triage`)

Purpose: review new `status='pending'` items before they go public.

- Shows up to 50 items. **Community submissions (`uploadedByUserId IS NOT NULL`) sort to the top of the stack**; within each group the tiebreaker is `subscriptions DESC` so the highest-confidence auto-ingested items still rise. This way moderators clear user-flagged items first instead of hunting for them.
- Each card shows: thumbnail, title, **Community submitted** pill (purple, when `uploadedByUserId` is set), Steam metadata (subs, favorites, vote score), kind badge, suggested tags with confidence scores, and the **full cleaned description** below the metadata. The description column flows inline and the card grows to fit, so moderators can read the entire body without an in-card scroll. The action footer is sticky-bottom so Approve/Skip/Reject stay reachable on long cards.
- **Rejecting a community-submitted card requires a reason.** The Reject button (and keyboard left-arrow / swipe-left gesture) opens a modal with a 300-char textarea instead of firing immediately; the reason is persisted into the submitter's `submission_rejected` notification so they know what to fix. `rejectCreation` enforces the same rule server-side — a missing reason on a community row throws `reason_required_for_community_submission`. Non-community (auto-ingested) rejections still fire instantly and leave the reason blank.
- **Rejection reason presets (V9.0).** The modal surfaces five one-click preset pills — *Below threshold*, *Duplicate*, *Low quality*, *Missing attribution*, *Not Scrap Mechanic* — that fill the textarea with a short submitter-friendly sentence. Still editable before confirming. The same `REJECT_PRESETS` list is duplicated in `QueueItem.tsx` so rejection notifications stay consistent across both surfaces.
- **Community-submission counter in the header (V9.0).** When `pending AND uploaded_by_user_id IS NOT NULL` count > 0, the header renders a purple "N community-submitted waiting — these are up first" pill below the batch counter. One extra `COUNT(*)::int` query bundled into the existing `Promise.all` — no extra round-trip.
- **Kind filter (V9.6).** Optional `?kind=X` URL param narrows the queue to a single creation kind (blueprint / mod / world / tile / …). A filter bar of pills sits above the stack showing per-kind totals plus a small purple `+N` badge for how many within each kind are community-submitted. The "All" pill clears the filter. Pills are full-page links, not client-side transitions, so the stack's buffer state resets cleanly when switching filters. Community-first ordering still applies inside the filtered slice — filtering to `kind=mod` still floats community-submitted mods to the top of the stack before auto-ingested ones. Per-kind counts come from one extra `GROUP BY kind` query bundled into the existing `Promise.all`.
- **Actions:**
  - **Approve** — sets `status=approved`, `approvedAt=now()`, confirms selected tags (sets `confirmed=true`)
  - **Reject** — sets `status=rejected`. The form includes an optional `reason` text input (max 300 chars); if filled, it's appended to the submitter's rejection notification body (`"<title>" was not accepted. Reason: <reason>`).
  - **Quick Approve** — fast-path, skips manual tag confirmation; suggested tags stay `confirmed=false` for community voting to decide

---

## Tag Queue (`/admin/queue`)

Purpose: catch approved items that still have no publicly visible tags.

- Shows approved creations with no admin-confirmed (non-rejected) tags AND fewer than 3 net community upvotes on any tag
- Limit 30. **Community-submitted items (`uploadedByUserId IS NOT NULL`) float to the top**; within each group the tiebreaker is `approvedAt DESC`. Rationale mirrors the triage ordering — user-flagged items are higher-intent and should get tag attention first.
- Each item carries a purple **Community submitted** pill next to the title when `uploadedByUserId` is set, matching the triage visual.
- Lets admin confirm or dismiss tag suggestions after the fact.
- **Rejection on a community-submitted item is guarded.** The reason input becomes a required field (purple border + "required" placeholder) and the Reject button refuses to submit with a toast if it's blank. Server `rejectCreation` throws the same error if called directly. Non-community rows accept blank reasons exactly as before.

---

## Reports Queue (`/admin/reports`)

Community-submitted reports. Two shapes share the queue:

- **Creation reports** — the original flag-a-creation path. Status flow: `open` → `cleared` | `actioned`. Actions: **Clear** (dismiss), **Action** (public mod-note badge via `actionReport`), **Archive creation** (`archiveFromReport` — archives the creation AND actions the report in one step).
- **Comment reports** — render in a distinct sky-bordered card with the reported comment's body quoted inline and a link back to `#comment-<id>` on the parent creation or profile. Actions: **Clear** or **Delete comment** (`deleteCommentFromReport` — soft-deletes the comment and actions the report). No public badge path — the moderation outcome is simply that the comment is gone.

Both shapes route through the same `reports` table (XOR between `creationId` and `commentId`) and both broadcast a moderator-tier notification on submission.

---

## Server Actions (`app/admin/actions.ts`)

### Permission hierarchy

```
requireMod()       → moderator, elite_moderator, creator
requireEliteMod()  → elite_moderator, creator
requireCreator()   → creator only
```

All helpers check `effectiveRole` (ban-aware), not `user.role` directly. **Every admin server action calls `requireMod/Elite/Creator` as its first statement** — the layout-level gate at `/admin/(gated)` is not sufficient, because server actions can be invoked from any page that imports them.

### Audit log (V9.1+)

Every non-trivial admin server action calls `logModAction({ actor, action, targetType, targetId, summary, metadata })` from `lib/audit/log.ts` on success. Rows land in `mod_actions` and surface at `/admin/audit` (Creator-only view since V9.3 — the log exists for the Creator to review coverage on return, not for mods to self-audit or look at each other). Helper is never-throws so a failed insert can't unwind the mod action itself.

Action naming is `<noun>.<verb>` and stable — external consumers (filter UI, dashboards) match on these exact strings:

- `creation.approve` / `creation.quickApprove` / `creation.reject` / `creation.saveTags` / `creation.confirmTag` / `creation.removeTag` / `creation.setKind` / `creation.archive` / `creation.archiveFromReport` / `creation.restoreFromArchive` / `creation.delete` / `creation.rescrapeCreators` / `creation.adminAddPending` / `creation.adminAddApproved`
- `tag.create` / `tag.upsert` / `tag.update`
- `category.create` / `category.upsert` / `category.delete`
- `user.ban` / `user.unban` / `user.hardBan` / `user.clearHardBan` / `user.mute` / `user.unmute` / `user.warn` / `user.clearWarnings` / `user.setRole` / `user.grantAgeGateBypass` / `user.revokeAgeGateBypass`
- `badge.grant` / `badge.revoke`
- `appeal.grant` / `appeal.dismiss`
- `report.clear` / `report.action`
- `comment.deleteFromReport`
- `ingest.manualRun`

The `metadata` jsonb carries contextual details (reason strings, prior values, counts). The `summary` column is a pre-formatted one-line English string so the UI doesn't have to know every action's shape.

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
| `deleteCommentFromReport(reportId)` | Mod+ | Soft-delete the reported comment + action the report |
| `deleteCategory(id)` | Creator | Remove a category. Tags in it fall to "Uncategorised" (FK `set null`); creation↔category links cascade away. |
| `createTag` / `updateTag` (name field) | Mod / Creator | Tag names are validated by `isEnglishTagName` (`lib/i18n/english-tag.ts`) — only A–Z, 0–9, spaces, and basic punctuation pass. Non-Latin scripts, accented letters, and umlauts are rejected so the catalogue stays consistent across every UI language. |
| `grantBadgeAction(steamid, slug)` | Creator | Grant one of the defined badges to a user |
| `revokeBadgeAction(steamid, slug)` | Creator | Revoke a badge grant |
| `addInfluencerAutograntAction(input, label)` | Creator | Add to the badge autogrant allowlist. Input accepts Steam64, profile URL, or vanity URL. Managed via `/admin/badges`. |
| `removeInfluencerAutograntAction(steamid)` | Creator | Remove from the allowlist. Doesn't revoke existing grants. |
| `deleteCreation(id)` | Creator | Permanent `status=deleted`, clears reports |
| `setCreationKind(id, kind)` | Creator | Inline reclassify a single creation's `kind`. Rendered as a small purple picker on `/creation/[id]` next to the Delete button. Revalidates `/`, `/new`, `/search`, and the creation page; `/[kind]` listings are force-dynamic so they don't need explicit busting. Exists because `detectKind` occasionally misclassifies at ingest (Steam tag coverage is incomplete). |

### User management (Creator-only)

| Action | Notes |
|---|---|
| `setUserRole(steamid, role)` | Assigns mod/elite. Cannot set creator via UI. Cannot modify self. First-time promotion to mod+ stamps `users.moderatorSinceAt = now()`; subsequent promotions leave the column alone so re-promoted users keep the original date. |
| `banUser(steamid, durationDays \| "perma")` | Temporary or permanent ban |
| `clearBan(steamid)` | Lifts ban |
| `muteUser(steamid, durationDays \| "perma")` | Elite+ required. Blocks votes/comments/reports/favorites |
| `clearMute(steamid)` | Lifts mute |
| `warnUser(steamid, note)` | Increments `warningsCount`, records note. Visible to mod+. |
| `clearWarnings(steamid)` | Resets `warningsCount` to 0 and clears `warningNote`. Creator-only. |
| `setAgeGateBypass(steamid, on)` | Flips `users.bypassAgeGate`. Creator-only. When `on`, the user skips the 7-day Steam account-age gate in `requireVotingUser` / `requireActiveUser`. Useful for trusted community members with fresh Steam accounts. |
| `grantAgeGateAppeal(steamid)` | **Mod+**. Flips `bypassAgeGate=true` and stamps `ageGateAppealHandledAt=now()`, then notifies the user their appeal was approved. Scoped to the appeals queue — mods cannot grant bypasses to arbitrary users via `/admin/users`, only to users who self-identified through `/verify/appeal`. |
| `dismissAgeGateAppeal(steamid)` | **Mod+**. Stamps `ageGateAppealHandledAt=now()` without flipping the bypass, removing the request from the queue. The user can re-appeal after 24 h and it'll resurface. |
| `hardBanUser(steamid)` | Sets `hardBanned=true`. Blocks future sign-ins. Existing sessions die immediately. |
| `clearHardBan(steamid)` | Wipes hard ban + ban reason |

### Tags

| Action | Notes |
|---|---|
| `createTag(name, slug, categoryId)` | Normalizes slug, upserts to avoid duplicate errors |
| `updateTag(tagId, name, slug, categoryId)` | Creator-only. Fixes misspellings or re-buckets a tag. Normalises the slug; rejects collisions with another tag's slug. `creation_tags.tag_id` is the immutable FK, so changing the slug doesn't orphan anything — but bookmarked `/search?tags=<old>` URLs break. |
| `createCategory(name, slug)` | Creates a new category |

### Ingest (Creator-only since V9.0)

| Action | Notes |
|---|---|
| `triggerIngest(formData)` | Manual ingest run. Form fields: `pagesPerKind` (1–50, default 20), `order` (`trend`/`new`), `kinds[]` (checkboxes). Passes `skipAgeGate: true` and `minNewPerKind: 50` so runs actually surface novel items from a saturated trending top. Persists the form selection to the `smse_ingest_prefs` cookie so controls don't snap back to defaults after a run. `requireCreator()`. |
| `getManualIngestPrefs()` | Helper (in `lib/admin/ingest-prefs.ts`) that reads the persisted form cookie. Called from the `/admin/ingest` page to set `defaultValue`s on the trigger form. |
| `addCreation(urlOrId, autoApprove?)` | Manual item add by Steam URL or ID. `requireMod()` — opened to mods/elite mods in V9.18 (was Creator-only before) so mods can pull in small gems the cron wouldn't grab on its own. Bypasses the follower-count floor. |
| `triggerFakeReboot()` | V9.10+. Inserts `deployAnnouncements { scheduledAt: now()+60s, isPrank: true }`. `requireCreator()`. Surface at `/admin/abuse`. |

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
- **Creator note field** — inline editable, shown publicly on the Ideas board. The status-transition buttons (Approve / Reject / etc.) save the note along with the transition; a separate **Save note** button (`updateSuggestionNote`) persists note edits without changing status or sending a submitter notification, so the creator can keep a dialogue going on a live idea.
- **Hard delete** (🗑) — completely removes the row and cascades votes; no undo

---

## Archive

`/admin/archive` is **strictly view-only** for mods. Elite mods and the creator can restore from this page. Regular mods cannot.

Archived creations are not visible on the public site but their data is preserved.
