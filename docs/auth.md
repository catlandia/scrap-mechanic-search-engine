# Authentication & Authorization

## Two Auth Systems

This project has two distinct auth mechanisms that coexist:

1. **Admin password gate** (`ADMIN_PASSWORD` env var) — legacy, used only for the initial admin panel before Steam login was added. Now superseded by the role system but the middleware still references it.
2. **Steam OpenID** — the primary auth system for all community features. Users log in with their Steam account; no password is ever stored.

---

## Steam OpenID Flow

```
User clicks "Sign in with Steam"
        │
        ▼
GET /auth/steam/login
  → Redirects to Steam's OpenID endpoint
        │
        ▼
Steam authenticates and redirects back to:
GET /auth/steam/return?openid.*=...
  → Verifies OpenID assertion
  → Resolves steamid from the claimed_id URL
  → Checks hard_banned — if true, redirect to /?auth_error=hard_banned
  → Upserts user row in DB (personaName, avatarUrl, etc.)
  → Sets iron-session cookie (smse_session)
  → Redirects to ?next= param or /
        │
        ▼
GET /auth/logout
  → Destroys session cookie
  → Redirects to /
```

---

## Session

**Library:** `iron-session`
**Cookie name:** `smse_session`
**Contents:** `{ steamid: string }` (encrypted)
**Secret:** `SESSION_SECRET` env var (must be ≥ 32 chars)

**`getUserSession()`** — returns the raw iron-session object. Use when you only need the steamid.

**`getCurrentUser()`** — returns the full `User` row from the DB, or `null` if:
- No session cookie
- Cookie invalid
- User row doesn't exist
- User is hard-banned (`hard_banned = true`)

`getCurrentUser()` is wrapped in React's `cache()` so it runs at most once per request regardless of how many server components call it.

**`isBanned(user)`** — returns `true` if `bannedUntil` is in the future.
**`isMuted(user)`** — returns `true` if `mutedUntil` is in the future.

---

## Role Hierarchy

```
creator           (highest — env-locked to CREATOR_STEAMID)
elite_moderator   (can archive, restore, mute)
moderator         (can triage, report queue, warn)
user              (base authenticated role)
ghost             (= null, unauthenticated or banned)
```

Roles are stored in `users.role`. The creator role **cannot be assigned through the UI** — it is granted at login time if the user's steamid matches `CREATOR_STEAMID`.

### `effectiveRole(user)`

Located in `lib/auth/roles.ts`. This is the canonical function for checking permissions.

```ts
effectiveRole(user) → UserRole | null
```

Returns `null` (ghost) if the user is currently banned (`bannedUntil > now`), otherwise returns their `role`. All permission checks in server actions and UI rendering should use this, not `user.role` directly.

The ban lifting is **automatic** — no cron job needed. When `bannedUntil` elapses, `effectiveRole` naturally returns the real role again.

### Other helpers (`lib/auth/roles.ts`)

| Function | Description |
|---|---|
| `roleRank(role)` | Returns numeric rank (user=1, mod=2, elite=3, creator=4) |
| `hasRoleAtLeast(user, minRole)` | True if effective role ≥ minRole |
| `getRoleDisplayName(role)` | Human-readable label |
| `getRoleBadgeClass(role)` | Tailwind color classes for badge rendering |

---

## Permission Tiers

These helper functions live in `app/admin/actions.ts` and `lib/suggestions/actions.ts`. All throw or return an error string if the check fails.

| Helper | Minimum role required |
|---|---|
| `requireMod()` | `moderator` or higher |
| `requireEliteMod()` | `elite_moderator` or higher |
| `requireCreator()` | `creator` only |

All helpers also check the ban status via `effectiveRole`.

---

## Middleware (`middleware.ts`)

Gates `/admin/*` routes. Unauthenticated requests are redirected to `/auth/steam/login?next=[original_path]`. Auth routes (`/auth/*`) are always open.

Per-route role checks (mod, elite, creator) happen inside the page component or server action where DB access is cheap — not in middleware.

---

## Hard Ban

Hard ban is a separate, more severe mechanism than the regular time-based ban.

**What it does:**
- Sets `users.hard_banned = true`
- Also sets `bannedUntil = 9999-12-31` so ghost UI treatment works
- Blocks sign-in at the Steam return handler (`/auth/steam/return`) — the user gets redirected to `/?auth_error=hard_banned`
- `getCurrentUser()` returns `null` for hard-banned users, so any still-live session cookie immediately becomes useless
- The hard ban UI shows `🔒 Hard-banned` at the top of the moderation status card on `/profile/[steamid]`

**Who can apply it:** Creator-only (`hardBanUser` server action).

**Reversal:** `clearHardBan` wipes `hardBanned`, `banReason`, and resets `bannedUntil` to null.

---

## Community Write Gates

Most community write actions check multiple conditions before proceeding:

1. User must be logged in
2. `effectiveRole(user)` must not be null (not banned)
3. User must not be muted (for votes, comments, reports, favorites)
4. Steam account must be ≥ 7 days old (for submissions and suggestions)
5. Rate limit: 1 submission per 5 minutes (suggestions), creation-level rate limits on votes

---

## Profile Visibility

`/profile/[steamid]` displays:
- Basic info always shown: persona name, avatar, role badge, joined date
- Moderation status (ban, mute, warnings) visible to the user themselves and to mods+
- Hard-banned indicator visible to creator
- Playtime in Scrap Mechanic (if Steam profile is not private)
- All approved creations submitted by this user
