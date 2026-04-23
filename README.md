# Scrap Mechanic Search Engine

A curated, community-run directory of Scrap Mechanic Steam Workshop creations. Browse by kind (blueprints, mods, worlds, challenges, tiles, custom games, terrain), filter by tags, and find the good stuff without drowning in low-effort builds.

**Live site:** <https://scrap-mechanic-search-engine.vercel.app/>

Public beta. Free to use, no ads, no premium features, runs entirely on free-tier infrastructure.

> Fan project by CybeSlime2077. **Not affiliated with Axolot Games or Valve.**

## What it does

- **Curated Workshop browser.** Items go through a quality filter (follower-count floor + admin review) before they land on the public site.
- **Richer tags.** Community-driven tag system, not just Steam's handful of built-in tags. Users can suggest and vote on tags.
- **Search and sort.** Full-text search across title + description, plus sort by Steam or site rating, popularity, favourites, or newest.
- **Sign in with Steam.** OpenID only — your password never touches the site. Signed-in users can vote, favourite, comment, submit Workshop items, and suggest features.
- **Community moderation.** Mods can approve, archive, or flag creations; users can report items they think shouldn't be listed.
- **Feature suggestion board.** A built-in ideas board where users propose and vote on what to build next.

## Report a bug or suggest a feature

Use the in-app Ideas board at `/suggestions`.

## Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4
- Drizzle ORM + Neon Postgres (`drizzle-orm/neon-http` driver)
- `iron-session` for admin + user auth
- Vercel Cron for Steam Workshop ingest + periodic refresh
- Steam Web API for item data; Steam CDN hotlinked for thumbnails
- No paid services. No metered AI. Hobby-tier only.

## Running it locally

```bash
git clone https://github.com/catlandia/scrap-mechanic-search-engine
cd scrap-mechanic-search-engine
npm install
cp .env.example .env.local   # fill in the required vars below
npm run db:migrate
npm run dev
```

Required env vars (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `STEAM_API_KEY` | Steam Web API key from <https://steamcommunity.com/dev/apikey> |
| `SESSION_SECRET` | Any random string ≥ 32 chars |
| `CRON_SECRET` | Bearer token for the cron endpoints |
| `ADMIN_PASSWORD` | Legacy single-password admin gate |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (used for metadata + OG) |
| `CREATOR_STEAMID` | SteamID of the site owner — grants creator-tier role |

Dev server: <http://localhost:3000>.

## Internal documentation

Internal docs live under [`docs/`](docs/) — start with `docs/README.md` for the index.

This project is not currently accepting code contributions. For feature requests and bug reports, use the on-site Ideas board at `/suggestions`.

## License

Code is released under the [MIT License](LICENSE).

The character images in `lib/captcha/images/` are screenshots from Scrap Mechanic, © Axolot Games. They're included under fan-use; if Axolot asks for them to be removed, they'll be removed immediately.

Workshop metadata and thumbnails shown on the site are sourced from the Steam Web API and remain the property of their original creators and of Valve / Axolot where applicable. This directory only stores metadata and links back to the original Workshop pages.
