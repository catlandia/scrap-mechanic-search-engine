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
2. Every page on the live site starts showing a sticky red top-bar countdown (`components/DeployBanner.tsx` polls `/api/deploy-announcement` every 8s, ticks locally at ~30fps for smooth milliseconds, pulses under 10s). Two SFX fire alongside the visual — `public/sfx/deploy-countdown.mp3` the moment a new announcement first appears on the client, and `public/sfx/deploy-live.mp3` the instant the countdown hits zero. Each is keyed per-announcement via a ref so polls + render ticks can't retrigger. The zero-hit sting cuts off the countdown jingle mid-play if it's still going (`countdownAudioRef.pause()` then a fresh `Audio` for the sting) so the two tracks can't overlap — the sting always wins. `audio.play()` rejections from the browser autoplay policy are swallowed silently, so a visitor who hasn't interacted with the page still sees the banner; they just miss the sound. The same banner also serves the Creator-only fake-reboot prank from `/admin/abuse` — rows with `is_prank = true` run the identical countdown + SFX path, then swap to "just kidding :^)" at zero and self-hide 10s later; `scripts/complete-deploy.ts` explicitly skips prank rows so a real deploy landing during a prank tail doesn't stamp the wrong row as live.
3. Counts down in the terminal for 60 seconds.
4. Runs `git push` → triggers Vercel build → runs migrations → deploys.
5. The banner holds "Deploying now — the page will auto-refresh when the new version is ready." indefinitely — it never self-hides on a timer. `scripts/complete-deploy.ts` runs at the end of the Vercel build and stamps `completed_at` on the pending announcement. Clients see that on their next poll and the banner swaps to **"New version built — waiting for it to go live on the CDN…"** while the client polls every 2s for the actual traffic swap. Once the serving deployment's `VERCEL_GIT_COMMIT_SHA` (returned by `/api/deploy-announcement` as `serverBuildId`) differs from `NEXT_PUBLIC_BUILD_ID` baked into the old client's bundle, the banner flips to "✅ New version is live — reloading…" and the page auto-reloads onto the new bundle (one reload per announcement, guarded by sessionStorage so the new bundle doesn't reload itself in a loop). Gating the reload on the build-id swap — not just `completed_at` — is what prevents the "reloaded but landed back on the OLD bundle" window during the ~30–60s between `next build` finishing and Vercel actually promoting the new deployment to production.

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

## Key Vercel Constraints (Hobby Plan)

- **Cron jobs:** Max 2 cron jobs, minimum 1-day interval. Both our jobs are daily/weekly — within limits.
- **Function timeout:** 10 seconds default. Ingest and refresh are designed to be chunked. If a single ingest run times out, re-run manually with fewer pages.
- **Bandwidth:** Free tier is generous. Steam thumbnails are hotlinked from Steam's CDN — we serve no images ourselves.
- **Postgres:** Neon free tier has 0.5 GB storage and connection pooling limits. At expected scale (tens of thousands of creations) this is sufficient.

---

## Seeding a Fresh Database

```bash
npm run db:migrate    # apply schema
npm run db:seed       # insert categories + ~40 starter tags with keyword aliases
```

After seeding, trigger the first ingest manually from `/admin/ingest` with `pagesPerKind=5` to pull in a meaningful initial dataset.
