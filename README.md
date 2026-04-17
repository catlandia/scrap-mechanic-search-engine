# Scrap Mechanic Search Engine

A curated search engine for Scrap Mechanic Steam Workshop creations. Built to run on Vercel + Neon Postgres, 100% free-tier.

## Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4
- Drizzle ORM + Neon Postgres (serverless driver)
- Vercel Cron for periodic Steam Workshop ingest
- `iron-session` for admin auth (phase 4)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Neon pooled connection string
   - `STEAM_API_KEY` — from <https://steamcommunity.com/dev/apikey>
   - `CRON_SECRET` — any random string
   - `ADMIN_PASSWORD` and `SESSION_SECRET` — used in phase 4
3. `npm run db:generate && npm run db:migrate`
4. `npm run dev` → <http://localhost:3000>

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript without emit |
| `npm run lint` | Next.js lint |
| `npm run db:generate` | Emit SQL migrations from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:studio` | Drizzle Studio GUI |
| `npm run db:seed` | Seed categories + starter tag taxonomy (phase 2) |

## Implementation plan

The full build plan lives at `C:\Users\arkad\.claude\plans\hello-i-want-to-kind-avalanche.md`. Phase tracker is in the Claude Code task list.
