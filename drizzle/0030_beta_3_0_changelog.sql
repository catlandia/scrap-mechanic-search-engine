-- V9.0 / BETA 3.0 — seed the on-site changelog entry announcing the release.
-- Pure data migration (no schema change). Uses `NOT EXISTS` to stay
-- idempotent so re-running `npm run db:migrate` doesn't create duplicate
-- rows. The body is published immediately; authors field left NULL so
-- the public entry renders without "by" until the creator reclaims it
-- through /admin/changelog if they choose to.
INSERT INTO "changelog_entries" ("tier", "title", "body", "published_at")
SELECT
  'update',
  'BETA 3.0 — Ukrainian + Chinese translations, creator-only ingest, better moderator flow',
  $$Big milestone release — the site now speaks six languages, ingest powers consolidate into the Creator's hands, and moderators get concrete quality-of-life wins across triage and queue.

**New languages — Ukrainian (Українська) and Chinese (中文).** The language picker in /settings (and the language toggle in the top bar at lg+) now offers six locales: English, Русский, Українська, Deutsch, Polski, 中文. Every UI key that's already translated for RU/DE/PL gets a full UK/ZH translation too — navigation, home, /new, /creators, /search, /me/*, creation card labels, creation detail page, Ideas board, submit form, settings, footer presence counters, and the two minigames (Scrapcha and Blockdle — all 60+ Blockdle keys across every column header, leaderboard row, error, win/lose copy). Translations are AI-assisted first-pass seeds, same quality bar as the existing RU/DE/PL — native-speaker polishing is always welcome through the Ideas board. The English-only tag catalogue rule (V8.1) still holds: tags are cross-language navigation and stay ASCII; creations keep their author's original language.

**Ingest is now Creator-only.** `/admin/ingest` and `/admin/add` have been reclassified as Creator-tier tools — same tier as Users, Badges, Suggestions, and Changelog management. Manual ingest runs burn Steam API quota and can reshape the public catalogue wholesale; direct `/admin/add` of any Workshop URL bypasses the follower-count floor entirely. Neither is something a moderator should be able to do unilaterally without the site owner's judgement, so the gating matches the stakes. Server actions `triggerIngest` and `addCreation` now call `requireCreator()` instead of `requireMod()`; the nav pills move from the baseNav row to the purple creatorNav row; both pages render a friendly "Creator only" card for moderators who land on them directly. The moderator handbook at /admin/guide was updated to reflect the new boundaries. The daily cron at `/api/cron/ingest` is unaffected — it runs automatically on schedule and never needed a human to kick it.

**Moderator QoL — one-click rejection reason presets.** Rejecting a community-submitted item used to mean typing the same five sentences into the reason box over and over. Now both `/admin/triage` (the swipe modal for community-submit rejections) and `/admin/queue` (the inline reason input on community-submit rows) surface a row of five preset pills — *Below threshold*, *Duplicate*, *Low quality*, *Missing attribution*, *Not Scrap Mechanic*. One click fills the reason box with a short, submitter-friendly sentence that you can still edit before confirming. Same five presets across both surfaces so rejection notifications stay consistent regardless of which route the mod took. The rejection-reason-required behaviour for community submissions (V8.19) is unchanged — presets are a typing shortcut, not a bypass of the "reason required" rule.

**Moderator QoL — community-submission counter in triage header.** `/admin/triage` now shows a purple "N community-submitted waiting — these are up first" pill below the batch counter when there's at least one community-flagged item in the queue. Makes it obvious at a glance that the V8.19 priority sort is doing its job, and tells the mod exactly how many high-intent submissions they need to clear before the auto-ingest backlog resumes.

**README tidy-up.** The public repo readme no longer advertises "Issues and PRs welcome" or the contributor checklist. The site is a fan project with a single-person backend vision — the on-site Ideas board at /suggestions is the one canonical channel for feature requests and bug reports, and keeping that loud and clear avoids setting expectations that PRs are open for merging.

**Under the hood.** `LOCALES` in `lib/prefs.ts` went from `["en", "ru", "de", "pl"]` to `["en", "ru", "uk", "de", "pl", "zh"]`; `LOCALE_NATIVE_NAMES` picked up "Українська" and "中文"; `lib/i18n/dictionaries.ts` gained two full dictionaries (`uk` and `zh`) mirroring the existing RU/DE/PL key set. The language-picker pill group in the top bar renders all six now — slightly busier at lg, but still fits comfortably.

Thank you as always for the feedback that drove this release. Keep flagging things on the Ideas board.$$,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "changelog_entries"
  WHERE "title" = 'BETA 3.0 — Ukrainian + Chinese translations, creator-only ingest, better moderator flow'
);
