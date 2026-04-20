# Public Pages & Routing

All public pages are in `app/` using Next.js 15 App Router. Server Components by default; client components opted in explicitly.

---

## Route Map

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Home, force-dynamic |
| `/new` | `app/new/page.tsx` | Newest feed, paginated |
| `/blueprints` | `app/[kind]/page.tsx` | |
| `/mods` | `app/[kind]/page.tsx` | |
| `/worlds` | `app/[kind]/page.tsx` | |
| `/challenges` | `app/[kind]/page.tsx` | |
| `/tiles` | `app/[kind]/page.tsx` | |
| `/custom-games` | `app/[kind]/page.tsx` | |
| `/terrain` | `app/[kind]/page.tsx` | |
| `/search` | `app/search/page.tsx` | Full filter UI |
| `/creators` | `app/creators/page.tsx` | All Workshop authors ranked by creation count, name-searchable |
| `/creation/[id]` | `app/creation/[id]/page.tsx` | Accepts shortId or publishedfileid |
| `/profile/[steamid]` | `app/profile/[steamid]/page.tsx` | User profile |
| `/author/[steamid]` | `app/author/[steamid]/page.tsx` | Creator's items |
| `/me` | `app/me/page.tsx` | Redirect to own profile |
| `/me/favourites` | `app/me/favourites/page.tsx` | User's bookmarks |
| `/me/submissions` | `app/me/submissions/page.tsx` | User's submitted Workshop items with status badges |
| `/me/notifications` | `app/me/notifications/page.tsx` | User's notifications; marks all read on load |
| `/submit` | `app/submit/page.tsx` | Submit a Workshop item |
| `/suggestions` | `app/suggestions/page.tsx` | Ideas board — tabbed below `lg`, three-column kanban (Approved / Implemented / Rejected) at `lg+` |
| `/suggestions/new` | `app/suggestions/new/page.tsx` | Submit a suggestion (noindex) |
| `/settings` | `app/settings/page.tsx` | User preferences hub (theme, ratings, account links, help) |
| `/settings/theme` | `app/settings/theme/page.tsx` | Custom theme editor |
| `/terms` | `app/terms/page.tsx` | Terms of use |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/about` | `app/about/page.tsx` | Curation criteria — explains thresholds + admin review + community submission path |
| `/verify/appeal` | `app/verify/appeal/page.tsx` | Age-gate appeal form. Sign-in gated but NOT age-gated — private-profile users need it. Broadcasts `mod_age_gate_appeal` to moderator tier with the user's steamid + message. Rate-limited to 1 per 24 h. Noindex. |

**Indexing:** `/me/*`, `/verify`, `/auth/*`, `/profile/[steamid]`, `/suggestions/new`, and `/submit` are all `noindex`. `robots.ts` disallows the same set plus `/admin/` and `/api/`.

**Metadata:** Every public route above has `generateMetadata` or a static `metadata` export with title, description, and `alternates.canonical`. `/creation/[id]` and the root layout carry full Open Graph + Twitter card blocks; the root layout sets `metadataBase` from `NEXT_PUBLIC_SITE_URL` and `app/icon.png` / `app/apple-icon.png` serve as the favicons.

**Offset clamp:** `?page=` is clamped to `≤200` on `/search` and `/me/favourites` so deep OFFSET queries can't DoS Neon.

---

## Home (`/`)

**Rendering:** `force-dynamic` — no static caching because counts and newest items change frequently.

**Contents:**
- Hero with site description + example tag filter links
- "Newest additions" row (12 items, `approvedAt DESC`)
- Featured rows per kind: blueprints, mods, worlds, challenges (sorted by popularity)
- Kind count dashboard (number of approved items per kind)

Database queries run in parallel via `Promise.all`.

---

## Per-Kind Pages (`/[kind]`)

**Routes:** `/blueprints`, `/mods`, `/worlds`, `/challenges`, `/tiles`, `/custom-games`, `/terrain`

**`generateStaticParams()`** generates static paths for all valid kind slugs. Unknown slugs 404.

**Features:**
- 24 items per page
- Sort dropdown (10 modes — see Search section)
- Prev/Next pagination
- Kind-specific tag filter sidebar — top 20 tags by usage within that kind, with counts. Fed by `getTopTagsForKind`; each chip links to `/search?kind=X&tags=Y` rather than filtering in place, so the search page's richer filter UI does the heavy lifting.

---

## Search (`/search`)

Full-featured search with URL-based state (links are shareable).

**Query parameters:**

| Param | Type | Notes |
|---|---|---|
| `kind` | slug | Filter to one kind |
| `category` | slug | Filter to one category |
| `tags` | comma-separated slugs | ALL listed tags must match |
| `q` | text | Full-text search on title + descriptionClean (tsvector) |
| `sort` | string | See sort modes below |
| `page` | number | 1-indexed |

**Sort modes** (defined in `lib/db/queries.ts` · `SORT_MODES`):

| Value | Description |
|---|---|
| `relevance` | `ts_rank_cd` DESC — only exposed when `q` is present, auto-selected as the default in that case |
| `newest` | `approvedAt DESC` (newest on site) — default when `q` is empty |
| `oldest` | `approvedAt ASC` |
| `steam-newest` | `timeCreated DESC` (Steam upload date) |
| `steam-oldest` | `timeCreated ASC` |
| `popular` | Most subscribers (Steam) — `subscriptions DESC` |
| `unpopular` | Fewest subscribers (Steam) |
| `favorites` | Most favourites (Steam) — `favorites DESC` |
| `least-favorites` | Fewest favourites (Steam) |
| `rating` | Highest rated (Steam) — `vote_score DESC` |
| `least-rating` | Lowest rated (Steam) |
| `site-rating` | Highest upvote score (Site) — `(site_weighted_up - site_weighted_down) DESC` |
| `site-least-rating` | Lowest upvote score (Site) — `(site_weighted_up - site_weighted_down) ASC` |

Site-upvote sorts order by net score (`up - down`). No vote floor — zero-vote items land at 0 and mix with the tail, which is fine because 100↑/10↓ still beats 5↑/0↓ on raw net score (the ratio-based sort it replaced was gated behind a min-votes floor to avoid single-vote domination; net score doesn't have that pathology).

**Tag filtering logic:** All requested tag slugs in `?tags=` must match — intersection. Implemented as a `DISTINCT COUNT HAVING` subquery on `creationTags`.

**Negative tag filters:** `?exclude=<slug,slug>` drops any creation carrying at least one of those tags. Combines with `tags` — e.g. `?tags=car&exclude=mod` returns cars that aren't mod-class. Single-click a chip on the sidebar to include, double-click to exclude. A tag is never in both sets at once; hand-crafted URLs that list the same slug in both get the exclude side.

**Text search:** Postgres tsvector (`searchVector` on `creations`, GIN-indexed). `q` is compiled in `tsQueryExpr` as the OR of two subqueries: `websearch_to_tsquery('english', q)` (phrase quotes, `OR`, `-negation`) plus a prefix pass `to_tsquery('english', 'word1:* & word2:* & …')` built from the `\w+` tokens of the input. That way stems match (`cannon`/`cannons`) AND early-typing prefixes match (`cann` finds `cannon`) without losing the websearch syntax goodies. Ranking uses `ts_rank_cd` against the websearch side only so prefix-only matches don't dominate complete hits.

---

## Creation Detail (`/creation/[id]`)

**ID formats accepted:** numeric `shortId` (integer) or full Steam `publishedfileid` (string).

**Access:** Only approved creations are publicly accessible. Non-approved → 404.

**What's shown:**
- Thumbnail (hotlinked from Steam CDN)
- Title, kind badge
- Author name (linked to `/profile/[steamid]` if the user exists in DB)
- Cleaned description
- Steam metadata: subscriptions, favorites, vote score, views
- Site engagement: favorites, view count (from `creationViews`)
- Tags with role-based vote breakdown (how many users / mods / elites / creator voted on each tag)
- Comments section
- Public report badge (if any actioned report exists)

**Interactive elements (logged-in users):**
- Up/down vote on creation
- Up/down vote on individual tags
- Favorite button
- Report button

**Creator actions (creator role):**
- Remove a specific tag (sets `rejected=true`) — creator sees **all** non-rejected tags including community tags below the +3 vote threshold, so no false tag is ever unreachable
- Delete creation (`status=deleted`)

**Elite mod actions:**
- Archive creation

**Metadata:** OG image pulled from `thumbnailUrl`, title used as page title.

---

## Profile (`/profile/[steamid]`)

**Validation:** steamid param must match `^\d{1,25}$`.

**Contents (user has signed in):**
- Avatar, persona name, role badge
- Scrap Mechanic playtime (or "profile private" if null)
- Steam account creation date (if public)
- Site join date
- Moderation status (ban, mute, warnings) — visible to the user themselves and mods+
- Hard-ban indicator (`🔒 Hard-banned`) — visible to creator
- **Creations** — workshop items they authored or co-authored, first 24 with a "View all →" link to `/author/[steamid]` when there are more. Reuses `getAuthorCreations`. Renders only when they're credited on at least one approved item.
- **Submitted to the site** — items whose `uploadedByUserId` is this steamid (who pressed Submit, not who made it)
- **Favourites** and **Vote history**
- **Profile wall** — threaded comments targeting this profile

**Contents (steamid never signed in):** Instead of a 404, renders a small card saying the user isn't on the site yet. If `getAuthorProfile(steamid)` finds credited creations, the card links to `/author/[steamid]` ("View their creations →"). Also offers a Steam-profile external link. Invalid-format steamids still 404.

---

## Layout (`app/layout.tsx`)

**Header:** sticky at top with backdrop blur (`z-30`). Logo left, primary nav centre, actions right.

**Navigation links (desktop, hidden on mobile):**
- Newest (`/new`)
- Blueprints, Mods, Worlds, Challenges, Tiles (kind pages)
- Search (`/search`)
- Ideas (`/suggestions`)

**Rating-mode toggle** (`components/RatingModeToggle.tsx`): three buttons — Steam / Site / Both — posting to `/api/prefs/rating-mode` which sets the `smse_rating_mode` cookie (1-year maxAge, non-httpOnly so server components can read it via `lib/prefs.server.ts → getRatingMode()`). The selected mode is passed through every page that renders `<CreationGrid>` or `<StarRating>` so SSR output matches preference with no flicker. The toggle lives inline in the header on desktop and inside the mobile drawer on `<sm`.

**User menu (signed in, `components/UserMenu.tsx`):**
- Submit (icon on mobile, text on desktop)
- Favourites (heart icon on mobile, text on desktop)
- Bell icon with unread badge → `/me/notifications` (hidden when banned)
- Admin link (mod+, desktop only — mobile variant lives in the drawer)
- Avatar + persona name (name hidden `<sm`) + role badge
- Sign out (desktop; mobile-only sign-out lives in the drawer)

Unread notification count is fetched server-side in `app/layout.tsx` on every render and passed as a prop to `UserMenu`.

**Mobile drawer (`components/MobileNav.tsx`):** hamburger visible only on `<sm`. Opens a right-side slide-over panel rendered via `createPortal(document.body)` at `z-[100]` so it escapes the sticky header's stacking context. Contains:
- Primary nav links (Newest / kinds / Search / Ideas) with active-route highlight
- Extra links: Submit, Your favourites, Notifications, Your submissions, Admin triage (mods+)
- Rating-mode toggle
- Sign in / Sign out button

The drawer auto-closes on route change (`usePathname` effect) and locks `document.body` overflow while open.

**Unauthenticated:**
- "Sign in with Steam" button (desktop header + drawer)

**Footer:** Presence counters at the top (online within 5 min · signed-in users total — source: `getUserCounts()` in `lib/db/queries.ts`, anonymous visitors not tracked). Below: non-affiliation disclaimer (Scrap Mechanic is Axolot Games), data source (Steam Web API), privacy note about OpenID.

---

## Rating display (`lib/prefs.ts` / `lib/prefs.server.ts`)

The file is split intentionally:
- `lib/prefs.ts` — constants (`RATING_MODES`, `DEFAULT_RATING_MODE`, `RATING_MODE_COOKIE`) and the `RatingMode` type. Safe for client components.
- `lib/prefs.server.ts` — `getRatingMode()` / `setRatingModeCookie()` which call `next/headers`. Server-only.

Mixing the two in one file (as the initial implementation did) crashes the production build because webpack refuses to bundle `next/headers` into a client module.

`StarRating` (`components/StarRating.tsx`) prefers a raw `up / (up+down)` ratio over Steam's Wilson-smoothed `vote_score` whenever both counts are available — this avoids the "everything is 3 stars" regression where low-sample Steam scores collapse toward 0.5. Rating rendering requires ≥1 total vote (showcase mode — `MIN_VOTES_FOR_RATING` in `components/StarRating.tsx`; designed to live around 10 once vote volume catches up). Below the threshold the component shows `unrated` or `only N votes`.

---

## Rendering Strategy

- **`force-dynamic`:** Home page (live counts), user-specific pages (profile, favorites, me)
- **Static with `generateStaticParams`:** Per-kind pages (regenerated on deploy)
- **Default (ISR / dynamic on demand):** Search, detail pages, author pages

Steam CDN thumbnail URLs are hotlinked — no image optimization pipeline, no Vercel Blob. This is intentional (free tier constraint).

---

## Not-Found & Error Pages

- `app/not-found.tsx` — global 404 page
- `app/error.tsx` — global error boundary for runtime errors

The home page additionally shows a user-facing database connectivity error message if `getApprovedKindCounts()` fails (rather than crashing).
