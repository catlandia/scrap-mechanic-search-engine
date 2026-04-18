# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Project

Scrap Mechanic Search Engine — a curated public directory of Scrap Mechanic Steam Workshop creations (Blueprints, Mods, Worlds, Challenges, Tiles, Custom Games, Terrain Assets). Free-tier only: Vercel Hobby + Neon Postgres + Steam Web API. No paid AI API.

## Documentation

Detailed docs live in `docs/`. Start with `docs/README.md` — it's the index table mapping each area (database, auth, ingest, tagger, admin, community, pages, queries, deployment, captcha) to its owning file, and holds the per-version changelog. Before editing anything in `docs/`, read `docs/maintaining-docs.md` for the routing table and the rules that keep these files small, current, and non-duplicative.

## Stack

- Next.js 15 App Router, TypeScript
- Tailwind CSS v4 (CSS-first `@theme` config)
- Drizzle ORM + Neon serverless (`drizzle-orm/neon-http`)
- `iron-session` for admin auth, gated via `middleware.ts`
- Rule-based keyword tagger in `lib/tagger/` (no LLM)
- Vercel Cron for ingest + refresh

## Commands

```
npm install              # install deps
npm run dev              # start dev server (http://localhost:3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # next lint
npm run db:generate      # emit SQL migrations from lib/db/schema.ts
npm run db:migrate       # apply migrations via scripts/migrate.ts
npm run db:push          # drizzle-kit push (dev-only shortcut)
npm run db:studio        # Drizzle Studio GUI
npm run db:seed          # seed categories + starter tags
```

Env vars live in `.env.local` (see `.env.example`). Required for full operation: `DATABASE_URL`, `STEAM_API_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET` (≥ 32 chars), `NEXT_PUBLIC_SITE_URL`.

## Layout

- `app/` — App Router pages
  - `(public) /`, `/new`, `/search`, `/[kind]`, `/creation/[id]`
  - `/admin/login`, `/admin/logout`, `/admin/(gated)/{queue,tags,ingest}`
  - `/api/cron/{ingest,refresh}` — cron endpoints gated by `CRON_SECRET`
- `components/` — shared UI (`CreationCard`, `SearchFilters`, `admin/QueueItem`)
- `lib/`
  - `db/schema.ts` — Drizzle schema, single source of truth
  - `db/client.ts` — neon-http Drizzle client (lazy)
  - `db/queries.ts` — typed query helpers for public pages
  - `steam/client.ts` — Steam Web API wrapper
  - `steam/bbcode.ts` — BBCode stripper
  - `ingest/pipeline.ts` — fetch → follow-count gate → upsert → tagger
  - `ingest/refresh.ts` — weekly re-sync of vote/sub counts
  - `ingest/thresholds.ts` — per-kind follow-count minimums
  - `tagger/keywords.ts` — canonical tag slug → keyword aliases
  - `tagger/classify.ts` — weighted-hit scorer
  - `auth/session.ts` — iron-session config
- `middleware.ts` — gates `/admin/*` except `/admin/login`
- `drizzle/` — generated SQL migrations (checked in)
- `scripts/` — `migrate.ts`, `seed.ts`, `smoke-classify.ts`
- `vercel.json` — cron schedule

## Notes

- `neon-http` driver does not support transactions. Admin actions write sequentially; accept small windows of partial state on failure.
- The tagger runs only on newly-inserted creations (not on updates) so admin confirmations survive re-ingest.
- `app/[kind]/page.tsx` uses `generateStaticParams` against a whitelist; unknown slugs 404.
- Tsvector search column is intentionally deferred — `/search` uses ILIKE for now.
- Full implementation plan: `C:\Users\arkad\.claude\plans\hello-i-want-to-kind-avalanche.md`.
