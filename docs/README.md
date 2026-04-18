# Documentation Index

| File | What it covers |
|---|---|
| [overview.md](overview.md) | Project purpose, stack, version history, file structure, env vars, commands |
| [database.md](database.md) | Full schema — every table, column, index, and design decision |
| [auth.md](auth.md) | Steam OpenID flow, iron-session, role hierarchy, effectiveRole, hard ban |
| [ingest.md](ingest.md) | Cron pipeline, follow-count gate, thresholds, Steam API wrappers, BBCode stripper |
| [tagger.md](tagger.md) | Keyword classifier, scoring weights, keyword dictionary, taxonomy, tag visibility rules |
| [admin.md](admin.md) | All admin routes, server actions, permission tiers, triage/queue/reports/users/suggestions |
| [community.md](community.md) | Comments, creation votes, tag votes, favorites, item submissions, feature suggestion board |
| [pages.md](pages.md) | Every public route, rendering strategy, search params, layout/nav |
| [queries.md](queries.md) | All typed query helpers in lib/db/queries.ts and lib/suggestions/actions.ts |
| [deployment.md](deployment.md) | Vercel config, cron jobs, migrations, env vars, Hobby plan constraints |
| [captcha.md](captcha.md) | Custom SM-themed captcha — characters, session design, image hiding, tuning |
| [maintaining-docs.md](maintaining-docs.md) | Routing table + rules for keeping these docs small, current, and non-duplicative |

## Quick orientation

- Current version: **V4.16** — real full-text search (tsvector + GIN), `relevance` sort, ILIKE retired
- Stack: Next.js 15 App Router · TypeScript · Tailwind v4 · Drizzle + Neon · iron-session · Steam OpenID
- Hard constraint: everything must remain on **free tiers** — no paid APIs, no metered per-item costs
- Transactions are **not available** (neon-http driver) — writes are sequential, partial state is accepted

## Recent changes (V4.6–4.15)

- **V4.6:** 3-tab public ideas board (Approved/Implemented/Rejected); creator can reject live suggestions; creator-side tag removal button on creation detail page
- **V4.7:** `effectiveRole()` helper — banned users lose all write permissions automatically; ban lifts without manual cleanup when `bannedUntil` elapses
- **V4.8:** `hard_banned` column (migration 0010); hard ban blocks sign-in at Steam return handler; `getCurrentUser()` returns null for hard-banned users; full suggestion status transitions in admin UI; creator hard-delete on suggestions
- **V4.9:** Creator now sees all non-rejected tags on `/creation/[id]` (including community tags below the +3 vote threshold) so the × remove button is reachable on any false tag. Regular visitors still only see confirmed or ≥3 net-vote tags.
- **V4.10:** Scrap Mechanic logo image in nav replaces the plain "SM" text. Logo served from `public/logo.png`.
- **V4.11:** Custom Scrap Mechanic captcha on first visit. 3 correct in a row, 4 options, 9 characters (Mechanic/Totebot/Haybot/Tapebot/Farmbot/Glowb/Woc/Redtapebot + Chapter 2 easter egg at ~10% chance). `bot_verified` cookie lasts 30 days. See `docs/captcha.md`.
- **V4.12:** Character image filename hidden from network inspection. Image served via `/api/captcha/image` proxy route — actual path stored only in encrypted server-side session. Client never sees `Mechanic1.jpg` etc.
- **V4.13:** Steam-workshop appid gate (rejects non-SM items on submission); notifications system with bell icon + unread badge; `/me/submissions` status page; captcha nonce-based cache-busting; captcha only gates Steam login rather than the whole site.
- **V4.14:** Creator can clear user warnings from the admin user page.
- **V4.16:** `/search` now runs on a real Postgres full-text index. `creations.search_vector` is a generated-stored tsvector over `title + description_clean`, backed by a GIN index; queries use `websearch_to_tsquery('english', q)` so users get phrase quotes / `OR` / `-negation` for free. A new `relevance` sort mode ranks with `ts_rank_cd` and becomes the default whenever `q` is present. The old ILIKE `%q%` path is gone — stems now match (`cannon`/`cannons`) but substrings don't (`cann` no longer matches `cannon`); revisit with `:*` prefix if that bites. Migration `0012_overrated_alex_power.sql` adds the column + index; no ingest-pipeline change needed because Postgres maintains the column itself.
- **V4.15:** Rating-mode toggle (Steam/Site/Both) stored as cookie, applied across card + detail views. Fixed the "everything is 3 stars" bug — `StarRating` now computes raw `up/(up+down)` instead of trusting Steam's Wilson-smoothed `vote_score` (which regressed low-sample ratings toward 0.5); min-votes threshold raised from 5 to 10. Added `site-rating` / `site-least-rating` sort modes (5-vote floor). Queue reject action accepts an optional reason that surfaces in the submitter's rejection notification. Tightened appid check so a missing `consumer_appid` no longer slips through. Per-notification mark-read via `/api/notifications/[id]/click`. Rebuilt mobile header: sticky compact bar with logo + submit/heart/bell/avatar icons, hamburger opens a right-side drawer (portaled to `document.body` at `z-[100]`) with nav links, rating toggle, deep links (submissions, admin triage), and sign-out.
