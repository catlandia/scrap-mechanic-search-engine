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

## Quick orientation

- Current version: **V4.8** — hard ban, full suggestion status routing, creator hard-delete
- Stack: Next.js 15 App Router · TypeScript · Tailwind v4 · Drizzle + Neon · iron-session · Steam OpenID
- Hard constraint: everything must remain on **free tiers** — no paid APIs, no metered per-item costs
- Transactions are **not available** (neon-http driver) — writes are sequential, partial state is accepted

## Recent changes (V4.6–4.8)

- **V4.6:** 3-tab public ideas board (Approved/Implemented/Rejected); creator can reject live suggestions; creator-side tag removal button on creation detail page
- **V4.7:** `effectiveRole()` helper — banned users lose all write permissions automatically; ban lifts without manual cleanup when `bannedUntil` elapses
- **V4.8:** `hard_banned` column (migration 0010); hard ban blocks sign-in at Steam return handler; `getCurrentUser()` returns null for hard-banned users; full suggestion status transitions in admin UI; creator hard-delete on suggestions
