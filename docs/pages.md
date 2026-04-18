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
| `/creation/[id]` | `app/creation/[id]/page.tsx` | Accepts shortId or publishedfileid |
| `/profile/[steamid]` | `app/profile/[steamid]/page.tsx` | User profile |
| `/author/[steamid]` | `app/author/[steamid]/page.tsx` | Creator's items |
| `/me` | `app/me/page.tsx` | Redirect to own profile |
| `/me/favourites` | `app/me/favourites/page.tsx` | User's bookmarks |
| `/me/submissions` | `app/me/submissions/page.tsx` | User's submitted Workshop items with status badges |
| `/me/notifications` | `app/me/notifications/page.tsx` | User's notifications; marks all read on load |
| `/submit` | `app/submit/page.tsx` | Submit a Workshop item |
| `/suggestions` | `app/suggestions/page.tsx` | Ideas board (3 tabs) |
| `/suggestions/new` | `app/suggestions/new/page.tsx` | Submit a suggestion |

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
- Kind-specific tag filter sidebar (future enhancement)

---

## Search (`/search`)

Full-featured search with URL-based state (links are shareable).

**Query parameters:**

| Param | Type | Notes |
|---|---|---|
| `kind` | slug | Filter to one kind |
| `category` | slug | Filter to one category |
| `tags` | comma-separated slugs | ALL listed tags must match |
| `q` | text | ILIKE search on title + descriptionClean |
| `sort` | string | See sort modes below |
| `page` | number | 1-indexed |

**Sort modes:**

| Value | Description |
|---|---|
| `newest` | By `approvedAt DESC` (newest on site) |
| `oldest` | By `approvedAt ASC` |
| `steam-newest` | By `timeCreated DESC` (Steam upload date) |
| `steam-oldest` | By `timeCreated ASC` |
| `popular` | By net site votes DESC |
| `favorites` | By site favorites count DESC |
| `rating` | By vote ratio DESC |
| `subscriptions` | By Steam subscriptions DESC |
| `views` | By Steam views DESC |
| `updated` | By `timeUpdated DESC` |

**Tag filtering logic:** All requested tag slugs must match — intersection, not union. Implemented as a `DISTINCT COUNT HAVING` subquery on `creationTags`.

**Text search:** `ILIKE '%q%'` on title and descriptionClean. Full-text tsvector search is deferred (column exists in schema but ILIKE is used for now).

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

**Contents:**
- Avatar, persona name, role badge
- Scrap Mechanic playtime (or "profile private" if null)
- Steam account creation date (if public)
- Site join date
- Moderation status (ban, mute, warnings) — visible to the user themselves and mods+
- Hard-ban indicator (`🔒 Hard-banned`) — visible to creator
- Paginated list of approved creations by this user

---

## Layout (`app/layout.tsx`)

**Navigation links:**
- Newest (`/new`)
- Blueprints, Mods, Worlds, Challenges, Tiles (kind pages)
- Search (`/search`)
- Ideas (`/suggestions`)

**User menu (signed in):**
- Avatar + persona name + role badge
- Link to own profile
- Submit link (`/submit`)
- Favourites link (`/me/favourites`)
- Bell icon with unread badge → `/me/notifications` (hidden when banned)
- Admin link (mod+ only)
- Sign out

Unread notification count is fetched server-side in `app/layout.tsx` on every render and passed as a prop to `UserMenu`.

**Unauthenticated:**
- "Sign in with Steam" button

**Footer:** Non-affiliation disclaimer (Scrap Mechanic is Axolot Games), data source (Steam Web API), privacy note about OpenID.

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
