# Deployment

## Platform

**Cloudflare Workers** (free tier), via the OpenNext adapter (`@opennextjs/cloudflare`). The Next.js app is bundled into a single Worker and served at the custom domain **scrap-mechanic-search-engine.com** (domain + DNS on Cloudflare Registrar). Neon Postgres is unchanged — its HTTP driver runs inside the Worker.

Deploys are **not** triggered by `git push`. They run from a developer machine via `npm run deploy` (see below). Migrated off Vercel 2026-06-22.

### Why the images are static assets, not bundled

Free Workers cap a script at **3 MiB gzipped**. The captcha (23 MB) and blockdle-icon (7 MB) base64 manifests, imported into route code, pushed the Worker to 24 MiB. They were evicted from the JS bundle and are served as static assets instead (Cloudflare serves `/public` from its CDN, off the Worker size budget):

- **Blockdle/clicker icons** → `/public/blockdle-icons/<uuid>.png`, loaded directly by the client (icons aren't a cheat vector).
- **Captcha images** → content-hashed `/public/_captcha/<sha256>.jpg`, never exposed to the client; the session-gated `/api/captcha/image` + `/api/minigames/scrapcha/image` routes fetch them server-side through the `ASSETS` binding, keeping the set unenumerable. See `docs/captcha.md`.

Both `/public` subfolders are generated at build by the fetch scripts and gitignored. (R2 would have been the textbook fit for the private captcha set, but it isn't enabled on the account — the ASSETS-binding proxy gives the same practical privacy.)

---

## Environment Variables

Runtime secrets live as **Cloudflare Worker secrets** (`wrangler secret put` / `secret bulk`). Local dev and `npm run deploy` read them from `.env.local`. The cron secrets also live in **GitHub Actions secrets**.

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Worker + GitHub + `.env.local` | Neon Postgres connection string |
| `STEAM_API_KEY` | Worker + GitHub + `.env.local` | Free — `steamcommunity.com/dev/apikey`. Only the GitHub Actions crons actually call Steam (the Worker can't — Steam 403s Cloudflare IPs) |
| `SESSION_SECRET` | Worker + `.env.local` | Min 32 chars; iron-session key |
| `ADMIN_PASSWORD` | Worker + `.env.local` | Legacy single-password admin gate |
| `CRON_SECRET` | Worker + `.env.local` | Guards `/api/cron/*` (no longer driven by a scheduler — see Crons) |
| `CREATOR_STEAMID` | Worker + `.env.local` | Site owner; grants creator role on login |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` (baked at build) | `https://scrap-mechanic-search-engine.com`; OG/sitemap/robots |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `.env.local` | wrangler auth for `npm run deploy` |
| `CAPTCHA_IMAGES_*`, `BLOCKDLE_DATA_*` | `.env.local` (build-time) | Fetch the private image/data sets at build. Optional locally once the sets are on disk |

---

## Cron Jobs — GitHub Actions (`.github/workflows/cron.yml`)

Ingest + refresh **cannot run in the Worker**: Steam's Web API 403s Cloudflare's egress IPs, and free Workers cap a request at 50 subrequests (a full ingest makes far more). They run as plain Node jobs on GitHub-hosted runners via `scripts/cron.ts`, directly against Neon.

| Job | Schedule (UTC) | What it does |
|---|---|---|
| ingest | 6 AM daily | `runIngest` (≤5 pages/kind from Steam, follow-count gate, insert pending, tag) + `refreshStaleCreators(200)` |
| refresh | 3 AM Mondays | `runRefresh` — re-syncs subs/favorites/votes for approved items |

Secrets `DATABASE_URL` + `STEAM_API_KEY` are set in the repo's Actions secrets. Manual run: **Actions → cron → Run workflow**. The `/api/cron/*` routes still exist (handy for a manual curl with `Authorization: Bearer <CRON_SECRET>`) but nothing schedules them now.

---

## Database Migrations

Migrations live in `drizzle/` (checked in). `scripts/migrate.ts` runs as part of the build chain (between the asset-fetch scripts and `next build`), so a schema change ships with its code change in one `npm run deploy`. A failed migration fails the build; prod stays on the previous Worker version.

```bash
npm run db:generate   # emit SQL from schema changes
npm run db:migrate    # apply pending migrations
npm run db:push       # dev-only: push schema directly
```

---

## Deploying with a visitor countdown (`npm run deploy`)

**`git push` no longer deploys anything.** Production changes ship via `npm run deploy` (`scripts/deploy.ts`), which needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `.env.local`:

1. **Builds first** (`opennextjs-cloudflare build`, stamping the commit SHA into `CF_BUILD_SHA` → `NEXT_PUBLIC_BUILD_ID`) while the live Worker keeps serving the old bundle — so the slow build causes zero visitor disruption.
2. Writes a `deploy_announcements` row with `scheduled_at = now() + 60s`. Every live page shows a sticky red top-bar countdown (`components/DeployBanner.tsx` polls `/api/deploy-announcement` every 8s, ticks locally for smooth ms, pulses under 10s). Two SFX fire **only for Fun-Mode visitors** (`smse_fun_mode` cookie): `public/sfx/deploy-countdown.mp3` when the banner first appears, `public/sfx/deploy-live.mp3` at zero. The same banner serves the Creator-only fake-reboot prank from `/admin/abuse` (`is_prank = true`), also Fun-Mode-only; the live-stamp step skips prank rows.
3. Counts down 60s in the terminal.
4. `wrangler deploy` swaps the Worker — live at the edge within seconds.
5. Stamps `completed_at`. Clients see it on their next poll and hold "Deploying now…", then reload once `/api/deploy-announcement`'s `serverBuildId` (the **live Worker's** baked `NEXT_PUBLIC_BUILD_ID`) differs from the `NEXT_PUBLIC_BUILD_ID` in their loaded bundle. Gating on the build-id swap — not just `completed_at` — avoids reloading onto a not-yet-swapped bundle. One reload per announcement (sessionStorage-guarded), ~11.5s after the swap so the visitor sees the confirmation first.

**Why the 60s isn't cosmetic:** visitors may be mid-comment, tagging in `/admin/triage`, or filling `/submit`. The banner is a save-your-work warning. The only legitimate skip is a change no visitor could notice (e.g. `.claude/` config) — and since `git push` doesn't deploy, "skipping" just means it reaches prod on the next `npm run deploy`.

---

## Build

```bash
npm run build        # fetch-captcha → fetch-blockdle → migrate → next build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

`opennextjs-cloudflare build` runs `npm run build` internally, then bundles the Worker into `.open-next/` (gitignored). Standard webpack, no Turbopack in production.

---

## Database Client

`lib/db/client.ts` — lazy Drizzle client over `drizzle-orm/neon-http`. The Neon HTTP driver does **not support transactions**; admin writes are sequential and partial state is accepted on failure. Never write code that depends on atomicity.

---

## Free-Tier Constraints — which one actually bites

**Neon compute is the binding constraint, not the host.** Moving off Vercel removed the old Vercel Active-CPU worry, but Neon is unchanged: when its monthly compute quota runs out, every query throws `HTTP 402` and the site goes effectively dark until the monthly reset (`quota_reset_at`, queryable via Neon's management API — see the `reference-neon-api` memory). The `unstable_cache` layer on `lib/db/queries.ts` (see `docs/queries.md`) is the primary defence — every cache hit is one DB call not made.

Cloudflare Workers free tier is generous for this read-heavy app (100k requests/day), and static assets (images, JS, CSS) are served off the Worker entirely. The two limits that shaped the architecture were the **3 MiB Worker size cap** (→ images as static assets) and the **50-subrequest cap + Steam IP block** (→ crons on GitHub Actions).

### On-site signalling

Public error screens render `<ErrorExplain>`, which fetches `/api/health` (a tiny `SELECT 1`) and maps failures via `lib/errors/codes.ts`. A Neon 402 surfaces as `STORAGE_QUOTA_EXHAUSTED`; add new mappings in `classifyError()` as new failure modes appear.

---

## Seeding a Fresh Database

```bash
npm run db:migrate    # apply schema
npm run db:seed       # categories + ~40 starter tags
```

Then trigger the first ingest manually — run `npx tsx scripts/cron.ts ingest` locally (it talks to Neon + Steam directly), or kick the GitHub Actions `cron` workflow with the `ingest` input.
