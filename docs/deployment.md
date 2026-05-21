# Deployment

## Platform

Vercel Hobby plan (free). Linked to this GitHub repo. Automatic deployments on push to `main`.

---

## Environment Variables

Set in Vercel dashboard (Settings → Environment Variables). Pull locally with:
```bash
vercel env pull .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `STEAM_API_KEY` | Yes | Free — register at `steamcommunity.com/dev/apikey` |
| `CRON_SECRET` | Yes | Random string; cron endpoints check `Authorization: Bearer <value>` |
| `ADMIN_PASSWORD` | Yes | Legacy single-password admin gate |
| `SESSION_SECRET` | Yes | Min 32 chars; iron-session encryption key |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URL (e.g. `https://yourdomain.com`); used for OG meta |
| `CREATOR_STEAMID` | Yes | SteamID of site owner; grants creator-tier role on login |
| `CAPTCHA_IMAGES_TOKEN` | Yes (prod) | Fine-grained PAT with Contents:Read on the private captcha-images repo |
| `CAPTCHA_IMAGES_REPO` | Yes (prod) | `owner/repo` name of the private captcha-images repo |
| `CAPTCHA_IMAGES_BRANCH` | No | Defaults to `main` |
| `CAPTCHA_IMAGES_PATH` | No | Defaults to repo root — set if jpgs live in a subfolder |
| `BLOCKDLE_DATA_TOKEN` | Yes (prod) | Fine-grained PAT with Contents:Read on the private blockdle-data repo |
| `BLOCKDLE_DATA_REPO` | Yes (prod) | `owner/repo` name of the private blockdle-data repo |
| `BLOCKDLE_DATA_BRANCH` | No | Defaults to `main` |
| `BLOCKDLE_DATA_PATH` | No | Defaults to repo root — set if `blocks.json` + `icons/` live in a subfolder |

Captcha images **and** the Blockdle block catalogue are fetched at build time — the npm `build` script chains `scripts/fetch-captcha-images.ts` + `scripts/fetch-blockdle-data.ts` before `next build`. Both output sets are gitignored; first Vercel deployment requires all four required env vars per pipeline or the build fails. See `docs/captcha.md` and `docs/blockdle.md` for setup.

---

## Cron Jobs (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/ingest",  "schedule": "0 6 * * *"  },
    { "path": "/api/cron/refresh", "schedule": "0 3 * * 1"  }
  ]
}
```

| Job | Schedule | What it does |
|---|---|---|
| `/api/cron/ingest` | 6 AM UTC daily | Fetches ~50 new items per kind from Steam, runs follow-count gate, inserts pending, runs tagger |
| `/api/cron/refresh` | 3 AM UTC Mondays | Updates engagement metrics (subs, favorites, votes) for all approved items |

Both routes require `Authorization: Bearer <CRON_SECRET>` header. Vercel sends this automatically.

---

## Database Migrations

Migrations live in `drizzle/` and are checked into git.

```bash
# Generate a new migration from schema changes:
npm run db:generate

# Apply all pending migrations:
npm run db:migrate

# Shortcut for local dev (push schema directly, no migration file):
npm run db:push
```

**Migration history:**
- `0001` — initial schema
- `0002–0009` — community features, roles, comments, suggestions, votes
- `0010` — `hard_banned` column on users (V4.8)

Migrations also run automatically during every Vercel build — `scripts/migrate.ts` sits between the asset-fetch scripts and `next build` in `package.json`'s `build` command. This means a schema change plus its code change can ship together in one push: the migration runs before `next build`, Neon gets the new column, and the new code finds it there. If a migration fails the whole deploy fails (fail-fast), and prod stays on the previous working version.

---

## Deploying with a visitor countdown (`npm run deploy`)

**Every push to `main` must go through `npm run deploy` — never bare `git push`.** The 60-second countdown isn't cosmetic. Visitors may be in the middle of something that breaks when the site restarts: composing a long comment, tagging a pending item in `/admin/triage`, filling out a `/submit` form, mid-swipe through a triage stack. The banner gives them a visible + audible heads-up so they can finish or save before the bundle flips. A bare `git push` skips all of that and silently yanks the rug out from under anyone mid-action.

The only legitimate exception is a change no visitor could possibly notice (repo-internal docs, a commit to a branch other than `main`, etc.) — and the cost of running `npm run deploy` is still only 60 seconds, so erring toward running it is almost always correct.

The script:

1. Writes a row to `deploy_announcements` with `scheduled_at = now() + 60s`.
2. Every page on the live site starts showing a sticky red top-bar countdown (`components/DeployBanner.tsx` polls `/api/deploy-announcement` every 8s, ticks locally at ~30fps for smooth milliseconds, pulses under 10s). Two SFX fire alongside the visual — `public/sfx/deploy-countdown.mp3` the moment a new announcement first appears on the client, and `public/sfx/deploy-live.mp3` the instant the countdown hits zero — **only when the visitor has Fun Mode on** (`smse_fun_mode` cookie, default off; see `docs/pages.md` for the full preference story). Normies see the same banner, just silently; that's the correct trade-off because the banner is a genuine "save your work" warning but the SFX are pure flavour. Each is keyed per-announcement via a ref so polls + render ticks can't retrigger. The zero-hit sting cuts off the countdown jingle mid-play if it's still going (`countdownAudioRef.pause()` then a fresh `Audio` for the sting) so the two tracks can't overlap — the sting always wins. `audio.play()` rejections from the browser autoplay policy are swallowed silently. The same banner also serves the Creator-only fake-reboot prank from `/admin/abuse` — rows with `is_prank = true` run the identical countdown + SFX path, then swap to "just kidding :^)" at zero and self-hide 10s later, **but only for Fun-Mode visitors**; anyone with Fun Mode off gets an early-return and sees nothing, so a prank never jolts a visitor who didn't opt in. `scripts/complete-deploy.ts` explicitly skips prank rows so a real deploy landing during a prank tail doesn't stamp the wrong row as live.
3. Counts down in the terminal for 60 seconds.
4. Runs `git push` → triggers Vercel build → runs migrations → deploys.
5. The banner holds "Deploying now — the page will auto-refresh when the new version is ready." indefinitely — it never self-hides on a timer. `scripts/complete-deploy.ts` runs at the end of the Vercel build and stamps `completed_at` on the pending announcement. Clients see that on their next poll and the banner swaps to **"New version built — waiting for it to go live on the CDN…"** while the client polls every 2s for the actual traffic swap. Once the serving deployment's `VERCEL_GIT_COMMIT_SHA` (returned by `/api/deploy-announcement` as `serverBuildId`) differs from `NEXT_PUBLIC_BUILD_ID` baked into the old client's bundle, the banner flips to "✅ New version is live — reloading…" and the page auto-reloads onto the new bundle ~11.5s later (`RELOAD_DELAY_AFTER_SWAP_MS`). One reload per announcement, guarded by sessionStorage so the new bundle doesn't reload itself in a loop. Gating the reload on the build-id swap — not just `completed_at` — is what prevents the "reloaded but landed back on the OLD bundle" window during the ~30–60s between `next build` finishing and Vercel actually promoting the new deployment to production. The ~10s hold after the swap gives the visitor a visible beat to finish what they were doing (and see the "live — reloading" confirmation) instead of the page blinking out from under them the instant the CDN flips.

---

## Build

```bash
npm run build        # runs: fetch-captcha → fetch-blockdle → migrate → next build → complete-deploy
npm run typecheck    # tsc --noEmit (CI check)
npm run lint         # next lint
```

No paid build tools. No Turbopack in production (standard webpack).

---

## Database Client

`lib/db/client.ts` — lazy-initialized Drizzle client using `drizzle-orm/neon-http`.

**Important:** The Neon HTTP driver does **not support transactions**. Admin writes are sequential. Partial state is accepted on failure. Never write code that depends on atomicity.

---

## Free-Tier Constraints — which one actually bites

The site runs on two free-tier services (Vercel Hobby + Neon). They have totally separate meters, and **they are not equally dangerous.**

**Neon (the storage tier) is by far the bigger constraint. Vercel overuse is far less of a problem in comparison.**

When Neon's monthly quota runs out, every database lookup throws `HTTP 402` and the site goes effectively dark — the cached page shell still renders but anything needing a fresh read 404s or shows the error screen. Recovery only happens at the next monthly reset (the `quota_reset_at` field on the project, queryable via Neon's management API). At the time of writing (2026-05-21) the storage tier is **exhausted**; reset is **2026-06-01**.

By contrast, when Vercel's Fluid Active CPU cap is exceeded, the platform issues a *warning* — it does not auto-pause the site. The V9.33 outage banner went up in fear of an enforcement action that turned out not to happen (V9.34 confirmed). So Vercel overuse is annoying and worth caching against, but it doesn't take the site down the way a Neon exhaustion does.

**Rule of thumb:** optimise for fewer DB calls first, fewer Vercel function-CPU seconds second.

### Vercel (Hobby) meters

- **Cron jobs:** Max 2 cron jobs, minimum 1-day interval. Both our jobs are daily/weekly — within limits.
- **Function timeout:** 10 seconds default. Ingest and refresh are designed to be chunked. If a single ingest run times out, re-run manually with fewer pages.
- **Fluid Active CPU:** 4 hours/month. SSR public pages (`/`, `/[kind]`, `/creation/[id]`, `/search`, `/new`) all use `force-dynamic` for cookies/auth, so Next's route cache doesn't help. The countermeasure is `unstable_cache` on the underlying DB query helpers in `lib/db/queries.ts` — see `docs/queries.md` for tags / TTLs / when admin actions flush them. Without that layer, organic traffic growth blows the 4h cap by mid-month. Per V9.34: tipping over warns but does **not** auto-pause.
- **Bandwidth:** Free tier is generous. Steam thumbnails are hotlinked from Steam's CDN — we serve no images ourselves.

### Neon (storage) meters

- **Compute hours** — the binding constraint. Active compute time is metered while the database is awake serving queries. When exhausted, every query returns HTTP 402 across the entire project until the monthly reset. The cron jobs are tiny; almost all consumption comes from page-traffic-driven DB hits, which is why the `unstable_cache` arc in V9.32 / V9.34 / V9.38 / V9.39 / V9.40 is the primary defence — every cache slot served from the data cache is one DB hit not made.
- **Storage (disk):** 0.5 GB cap. At current scale we're at ~10% of cap — a distant secondary concern.
- **Auto-suspend:** the compute auto-suspends after a default idle window (5 min on free). This is what keeps active-time bounded; do not disable it.
- **Diagnostics:** the project state (`active_time`, `cpu_used_sec`, `quota_reset_at`, `synthetic_storage_size`) is queryable via `GET /api/v2/projects?org_id=…` against `console.neon.tech/api/v2` with a `napi_` bearer token — see the `reference-neon-api` memory for the org/project IDs. The detailed daily-history endpoint is gated to Scale+ and not usable on free.

### On-site signalling

Public error screens (`app/error.tsx`, `app/global-error.tsx`, `app/creation/[id]/error.tsx`, `app/author/[steamid]/error.tsx`) render `<ErrorExplain>`, which fetches `/api/health` on the client. The route does a tiny `SELECT 1` against Neon, catches any failure, and runs it through `lib/errors/codes.ts` to map raw errors to a stable `{ code, explanation }` pair. A Neon 402 surfaces as `STORAGE_QUOTA_EXHAUSTED` with copy that names the June 1 reset; anything else falls through to `UNKNOWN — Unknown error.` Add new mappings in `classifyError()` as new failure modes are observed.

---

## Seeding a Fresh Database

```bash
npm run db:migrate    # apply schema
npm run db:seed       # insert categories + ~40 starter tags with keyword aliases
```

After seeding, trigger the first ingest manually from `/admin/ingest` with `pagesPerKind=5` to pull in a meaningful initial dataset.
