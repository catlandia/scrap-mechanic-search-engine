# Project Overview

## What this is

Scrap Mechanic Search Engine is a curated public directory of Steam Workshop creations for the game Scrap Mechanic (appid 387990). Visitors browse and search by category and tags to find quality creations without drowning in low-effort content.

Differentiators vs Steam's built-in browser:
- Human-reviewed quality gate (admin approval)
- Richer tag taxonomy built and maintained by the community
- Browsable by kind (Blueprint, Mod, World, etc.)
- Community voting on tags and creations
- Feature suggestion board

**Constraint that must never be broken:** Every external dependency must be genuinely free. No per-request billing, no metered AI APIs. The project is designed to run indefinitely on Vercel Hobby + Neon free tier.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS v4 (CSS-first `@theme` config) |
| Database | Neon Postgres (serverless) |
| ORM | Drizzle (`drizzle-orm/neon-http`) |
| Admin auth | `iron-session` (single ADMIN_PASSWORD) |
| User auth | Steam OpenID (no password, session via iron-session) |
| Auto-tagging | Rule-based keyword matcher (zero cost, pure TS) |
| Scheduling | Vercel Cron (Hobby plan, free) |
| Images | Steam CDN thumbnails (hotlinked, no Vercel Blob) |

---

## High-Level Architecture

```
Steam Web API
     │
     ▼
Ingest Pipeline (cron, daily)
     │  fetches new items per kind, follow-count gate
     ▼
creations table (status=pending)
     │  auto-tagger runs on insert
     ▼
Admin Queue / Triage
     │  approve / reject / edit tags
     ▼
creations (status=approved) ──► Public Site
                                  ├── / (home)
                                  ├── /new
                                  ├── /[kind]
                                  ├── /search
                                  └── /creation/[id]

Community layer (requires Steam login):
  ├── Comments on creations
  ├── Up/down votes on creations + tags
  ├── Tag nominations (community-sourced)
  ├── Workshop item submissions
  └── Feature suggestion board
```

---

## Version history

Per-version changelog lives in [`README.md`](README.md#recent-changes-v46810) — the quick-orientation block at the top shows the current version. Don't duplicate it here; a parallel list only decays.

---

## Environment Variables

Required for full operation (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `STEAM_API_KEY` | Steam Web API key (free, register at steamcommunity.com/dev/apikey) |
| `CRON_SECRET` | Bearer token cron endpoints check against |
| `ADMIN_PASSWORD` | Legacy single-password admin gate (pre-OpenID) |
| `SESSION_SECRET` | iron-session encryption key, min 32 chars |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (used for OG meta) |
| `CREATOR_STEAMID` | SteamID of the site owner — grants creator-tier role |
| `CAPTCHA_IMAGES_TOKEN` / `_REPO` / `_BRANCH` / `_PATH` | Private-repo credentials for the Scrapcha image pipeline (see [captcha.md](captcha.md)) |
| `BLOCKDLE_DATA_TOKEN` / `_REPO` / `_BRANCH` / `_PATH` | Private-repo credentials for the Blockdle data pipeline (see [blockdle.md](blockdle.md)) |

---

## Commands

```bash
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

---

## File Structure

```
app/
  (public routes)
    page.tsx                      # home
    new/page.tsx                  # newest-added feed
    [kind]/page.tsx               # per-kind landing (blueprints, mods, …)
    search/page.tsx               # full search with filters
    creation/[id]/page.tsx        # creation detail
    suggestions/page.tsx          # public feature board
    suggestions/new/page.tsx      # submit a suggestion
    submit/page.tsx               # submit a workshop item
    profile/[steamid]/page.tsx    # user profile
    author/[steamid]/page.tsx     # author's creations
    me/page.tsx                   # redirect to own profile
    minigames/page.tsx            # minigames landing grid
    minigames/scrapcha/           # Scrapcha character-ID game
    minigames/blockdle/           # Blockdle block-guess *dle game
  admin/
    login/page.tsx
    logout/page.tsx
    (gated)/                      # iron-session gated
      page.tsx                    # admin home
      queue/page.tsx              # post-approve tag queue
      triage/page.tsx             # pending approval queue
      tags/page.tsx               # taxonomy CRUD
      ingest/page.tsx             # run status + manual trigger
      reports/page.tsx            # moderation reports
      users/page.tsx              # user/role management
      archive/page.tsx            # archived creations view
      suggestions/page.tsx        # feature suggestion management
      add/page.tsx                # manual item add
  api/
    cron/ingest/route.ts
    cron/refresh/route.ts
    minigames/scrapcha/image/route.ts   # serves character JPG from manifest
    minigames/blockdle/icon/[uuid]/route.ts  # serves block PNG from manifest
  auth/
    steam/login/route.ts          # redirect to Steam OpenID
    steam/return/route.ts         # Steam callback, sets session
    logout/route.ts

components/                       # shared UI
lib/
  db/
    schema.ts                     # Drizzle schema (single source of truth)
    client.ts                     # neon-http Drizzle client
    queries.ts                    # typed query helpers
  auth/
    session.ts                    # iron-session helpers + getCurrentUser
    roles.ts                      # role hierarchy + effectiveRole
  steam/
    client.ts                     # Steam Web API wrappers
    bbcode.ts                     # BBCode → clean text
  tagger/
    keywords.ts                   # tag slug → keyword aliases
    classify.ts                   # weighted scorer
    taxonomy.ts                   # category + canonical tag list
  ingest/
    pipeline.ts                   # main ingest orchestrator
    refresh.ts                    # weekly engagement metric refresh
    thresholds.ts                 # per-kind follow-count minimums
  suggestions/
    actions.ts                    # suggestion CRUD server actions
  captcha/
    questions.ts                  # character-pool + question generator (shared /verify + /minigames/scrapcha)
    _images.generated.json        # base64 manifest (gitignored, build-time fetch)
  blockdle/
    types.ts compare.ts pick.ts session.ts share.ts
    blocks.generated.ts _icons.generated.json autocomplete.generated.ts  # all gitignored
  i18n/
    dictionaries.ts               # en/ru/de/pl translation keys + translate()
    server.ts                     # getT() — reads smse_lang cookie, returns {locale, dict, t}
    client.tsx                    # LocaleProvider + useT() for client components
    english-tag.ts                # isEnglishTagName — ASCII-only tag-name guard
middleware.ts                     # gates /admin/* behind login
vercel.json                       # cron schedule
drizzle/                          # generated SQL migrations (checked in)
scripts/
  migrate.ts
  seed.ts
  smoke-classify.ts
  fetch-captcha-images.ts         # prebuild: pulls captcha JPGs from private repo
  fetch-blockdle-data.ts          # prebuild: pulls blockdle data from private repo
  extract-blockdle-data.ts        # one-shot: extracts blocks + icons from local SM install
  backfill-creators.ts            # one-shot: re-scrape multi-creator attribution
```
