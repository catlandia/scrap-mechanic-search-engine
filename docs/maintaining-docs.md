# Maintaining Documentation

How the `docs/` folder is organized and the rules for keeping it useful.

The goal is to keep each doc small enough that a newcomer — or Claude starting a fresh session — can read the relevant file end-to-end in under a minute and know what the code does and why. Documentation that nobody reads is worse than none, because it slowly drifts from reality and becomes a trap.

---

## Routing table — what goes where

When you change the codebase, update the doc listed next to the area you touched. Do not spread one concern across multiple files; pick the primary owner.

| Area changed | Doc to update |
|---|---|
| Project purpose, stack, version history, env vars, top-level commands | `overview.md` |
| `lib/db/schema.ts`, migrations, column-level decisions | `database.md` |
| Steam OpenID flow, iron-session, role hierarchy, `effectiveRole`, hard ban | `auth.md` |
| `lib/ingest/*`, cron pipeline, thresholds, Steam API wrappers, BBCode stripper | `ingest.md` |
| `lib/tagger/*`, keyword dictionary, scoring, tag visibility rules | `tagger.md` |
| `/admin/*` routes, server actions, permission tiers | `admin.md` |
| Comments, votes, favorites, item submissions, suggestion board | `community.md` |
| Public routes, rendering strategy, search params, nav | `pages.md` |
| `lib/db/queries.ts`, `lib/suggestions/actions.ts` (typed query helpers) | `queries.md` |
| `vercel.json`, cron schedule, migrations-in-prod, Hobby plan limits | `deployment.md` |
| Captcha characters, session design, image hiding, tuning | `captcha.md` |
| Version bump, user-visible feature, new page, new admin action | `README.md` "Recent changes" |

If a change genuinely spans two areas (e.g., a new admin action backed by a new query helper), update both — but the *primary* description lives in one, and the other links to it.

When in doubt, the `docs/README.md` index is the authoritative map. If you add a new doc file, add it to that table in the same line-per-file format.

---

## Rules

### Keep it small

Prefer deleting over adding. If a section has gone unread through several changes, it probably no longer earns its space. A 200-line doc that stays current beats a 2000-line doc that nobody trusts.

Target ceiling: roughly 300 lines per file. When a file crosses that, look for a natural split along feature boundaries — don't split by chapter.

### Explain *why*, not *what*

Code already shows *what* happens. Docs are for the reasoning a reader can't recover from the code: the constraint that drove a design choice, the past incident that motivated a workaround, the rejected alternative and why it was rejected.

Bad (restates code):
> `getCurrentUser()` returns `null` when the user is hard-banned.

Good (explains design):
> Hard-banned users are filtered at `getCurrentUser()` rather than at every permission check. This way a hard ban blocks sign-in *and* every downstream write without each caller remembering to check. See V4.8 notes in `README.md`.

### No duplication across files

Every fact should live in exactly one doc. Cross-link instead of copying. When you update one place, you shouldn't have to remember to update a second. If you catch yourself copy-pasting a paragraph between files, move it to one home and link from the other.

### Version history lives in one place

`docs/README.md` holds the per-version "Recent changes" list. Individual doc files describe the *current* behavior — past versions belong in the README changelog or the git log, not sprinkled through feature docs with "previously this used…" paragraphs.

If a historical decision still influences current behavior (e.g., "we moved off transactions because the neon-http driver doesn't support them"), keep that in the relevant doc — but as present-tense constraint, not as history.

### Delete references to deleted things

When you remove a feature, grep for its name across `docs/` and `CLAUDE.md` and remove every mention. Docs that reference code that no longer exists are confusing and erode trust in the rest of the docs. This is the cheapest cleanup step and the most commonly skipped.

### Keep `CLAUDE.md` lean

`CLAUDE.md` loads into every Claude conversation, so every line has a tax. It should be a map, not a manual:

- Project one-liner
- Stack (one list)
- Commands (one block)
- Layout (directory map)
- Sharp edges that bite newcomers (neon-http has no transactions, tagger only runs on insert, etc.)

If you're tempted to add a section with more than ~5 lines, ask whether it belongs in `docs/` instead. Link to the doc rather than copying.

### Version bumps

Bump the version in `docs/README.md` (and `CLAUDE.md` if it references a version) when a change is visible to users or meaningfully changes architecture. Pure refactors and dependency bumps do not warrant a version bump.

The format is `V<major>.<minor>` — minor for user-visible increments, major for broad overhauls. Add a one-line entry under "Recent changes" describing what shipped and why it mattered.

---

## When NOT to touch docs

- Pure refactor with no behavior change
- Dependency bumps
- Typo or formatting fix in code
- Bugfix whose behavior was already correctly documented

In these cases, explicitly say "no doc update needed" rather than padding docs just because a step says to. Quality docs come from being selective about what enters them.
