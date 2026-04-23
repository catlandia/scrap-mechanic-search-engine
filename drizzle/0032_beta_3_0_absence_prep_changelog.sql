-- V9.1 — on-site changelog entry announcing the absence-prep release.
-- Idempotent via title guard so re-running `db:migrate` doesn't duplicate.
INSERT INTO "changelog_entries" ("tier", "title", "body", "published_at")
SELECT
  'update',
  'BETA 3.0 update — audit log, auto-notify mods on submissions, Top creator crown',
  $$Preparing the site for a stretch where the Creator can only check in occasionally. Everything in this release is about making moderators self-sufficient — they should have full visibility into each other's work, get pinged the moment something needs attention, and earn automatic recognition for what the community's actually producing.

**Every community submission now pings every moderator.** The V8.19 priority sort already floated user-flagged submissions to the top of `/admin/triage`, but a mod had to be actively watching the page to notice. Now `submitCreation` in `lib/community/actions.ts` broadcasts a `mod_community_submission` notification to every moderator+ the moment a row is inserted — submitter persona name + item title + a link straight to `/admin/triage`. Delivery is fire-and-forget (wrapped in try/catch), so a DB hiccup on the broadcast can't unwind the user-visible insert. The submitter themselves is excluded from the fan-out in case they're also a mod.

**Full moderator audit log at `/admin/audit`.** New `mod_actions` table records every non-trivial mod server action: approve / quick-approve / reject / archive / restore / hard-delete / set-kind / re-scrape / save-tags / confirm-tag / remove-tag / create-tag / update-tag / create-category / delete-category / grant-badge / revoke-badge / ban / unban / hard-ban / clear-hard-ban / mute / unmute / warn / clear-warnings / set-role / grant-appeal / dismiss-appeal / grant-age-gate-bypass / revoke-age-gate-bypass / manual-ingest / admin-add / clear-report / action-report / delete-comment-from-report. Each row stores actor (with persona snapshot), action, targetType:targetId, a human-readable summary, a jsonb metadata blob for contextual details (reasons, previous values, etc.), and a timestamp. A new `/admin/audit` page (mod-tier visible) lists the feed with filters for actor steamid, action type, and target, plus a dropdown that shows the top 15 most-used action types with counts. Paged 50 per screen. `logModAction()` in `lib/audit/log.ts` never throws — if an audit insert fails, the action the mod just took still goes through; worst case one entry is missing from the feed.

**Top creator crown (👑) auto-badge.** New `top_creator` badge in `lib/badges/definitions.ts`. Auto-managed: grants to the single site-account holder with the most approved creations (authors + co-authors, DISTINCT on creation id — same counting logic `/creators` uses). Revokes from everyone else. If the current #1 never signed in to the site, the badge sits unowned until someone with an account is on top. Tie-break is `site_joined_at ASC` — earliest to the site wins when counts are equal. Hard-banned users are filtered out of eligibility. `refreshTopCreatorBadge()` runs after every action that shifts the counts: approve, quick-approve, archive from report, manual archive, restore from archive, admin-add auto-approve, hard-delete, re-scrape creators. Listed in `SYSTEM_AUTO_BADGES` so the `/admin/users` page hides the manual grant button for it — manual grants would just be reverted on the next count-changing action. The server action `grantBadgeAction` also refuses `top_creator` with a `badge_system_auto_managed` error for defense in depth. Migration `0031` seeds the initial winner at deploy time (no waiting for the next approval).

**Tag and category attribution columns.** `tags.created_by_user_id` + `tags.created_at` and the same pair on `categories`. Pre-V9.1 rows carry nulls (there's no reliable historical source to backfill from). `createTag` and `createCategory` populate the new columns on insert; on upsert (same slug) they leave attribution untouched so the column always answers "who originally added this tag" rather than "who last edited it". Updates flow through the audit log regardless.

**`creations.reviewed_by_user_id`** was added in V2.0 but rarely populated — approve / quick-approve / set-kind / archive / restore all now write it, so "who last reviewed this creation" is now always recoverable from the row itself without cross-referencing the audit log.

**Top-bar banner bumped to BETA 3.0** copy. New `smse_beta_dismissed_v3_0` dismiss key so everyone who cleared the BETA 2.1 banner sees the new one once.

**UX for the single-moderator workflow.** With only one mod active while the Creator's away, the triage/queue combo from BETA 3.0 plus the audit feed means the mod can walk away, come back, and see exactly what they've handled vs. what's still pending. No more "did I already reject this one?" guesswork. If they approve someone's submission and need to back it out, the audit log tells them the exact timestamp so they can restore the archive later cleanly.$$,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "changelog_entries"
  WHERE "title" = 'BETA 3.0 update — audit log, auto-notify mods on submissions, Top creator crown'
);
