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

Always run `db:migrate` against the production Neon DB after deploying schema changes.

---

## Build

```bash
npm run build        # type-check + bundle
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
