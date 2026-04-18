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

## Quick orientation

- Current version: **V4.12** — custom captcha with hidden image proxy
- Stack: Next.js 15 App Router · TypeScript · Tailwind v4 · Drizzle + Neon · iron-session · Steam OpenID
- Hard constraint: everything must remain on **free tiers** — no paid APIs, no metered per-item costs
- Transactions are **not available** (neon-http driver) — writes are sequential, partial state is accepted

## Recent changes (V4.6–4.12)

- **V4.6:** 3-tab public ideas board (Approved/Implemented/Rejected); creator can reject live suggestions; creator-side tag removal button on creation detail page
- **V4.7:** `effectiveRole()` helper — banned users lose all write permissions automatically; ban lifts without manual cleanup when `bannedUntil` elapses
- **V4.8:** `hard_banned` column (migration 0010); hard ban blocks sign-in at Steam return handler; `getCurrentUser()` returns null for hard-banned users; full suggestion status transitions in admin UI; creator hard-delete on suggestions
- **V4.9:** Creator now sees all non-rejected tags on `/creation/[id]` (including community tags below the +3 vote threshold) so the × remove button is reachable on any false tag. Regular visitors still only see confirmed or ≥3 net-vote tags.
- **V4.10:** Scrap Mechanic logo image in nav replaces the plain "SM" text. Logo served from `public/logo.png`.
- **V4.11:** Custom Scrap Mechanic captcha on first visit. 3 correct in a row, 4 options, 9 characters (Mechanic/Totebot/Haybot/Tapebot/Farmbot/Glowb/Woc/Redtapebot + Chapter 2 easter egg at ~10% chance). `bot_verified` cookie lasts 30 days. See `docs/captcha.md`.
- **V4.12:** Character image filename hidden from network inspection. Image served via `/api/captcha/image` proxy route — actual path stored only in encrypted server-side session. Client never sees `Mechanic1.jpg` etc.
