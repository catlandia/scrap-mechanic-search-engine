# Blockdle

Second minigame. Near-impossible info-guesser: the player guesses a secret Scrap Mechanic block from its in-game stats. Ten tries, nine attribute columns, 500+ blocks in the pool. Daily finishers land on a leaderboard.

Route: `/minigames/blockdle?mode=daily|endless` (default: `daily`).

## Game rules

- **Ten attempts** per puzzle.
- Each guess is a block picked from the full creative-inventory catalogue (autocomplete off the name index).
- The server reveals per-attribute feedback across **nine columns**:
  - **Inv. Type** — `Blocks` / `Interactive Parts` / `Parts` / `Consumables`. These are the four colored-line buckets the game's backpack paints on slots; labels match `HANDBOOK_HOW_TO_PLAY_PAGE3_*` in `Data/Gui/Language/English/InterfaceTags.txt` verbatim.
  - **Category** — 23 finer buckets derived from the shapeset filename (`Blocks`, `Fittings`, `Lights`, `Interactive Containers`, `Harvestables`, `Survival Objects`, …). Text match / miss.
  - **Material** — from `physicsMaterial` (Metal, Wood, Rock, Plastic, Rubber, Glass, Mechanical, Cardboard, Plant, Grass, Fruit, Sand, Gum, Glass, Other). Text match / miss.
  - **Flammable** — yes / no from the shapeset's `flammable` field. Text match / miss.
  - **Level** — tier number within a detected family ("Concrete Block 3 / 5"). Numeric ↑/↓/= compare; both-null counts as a match, one-null as a miss. Non-tier blocks render as `✗` so "this block has no tier" reads at a glance instead of collapsing with "not yet revealed".
  - **Durability / Density / Friction / Buoyancy** (1–10) — numeric ↑/↓/=.
- Mode `daily` — one shared secret per UTC day, seeded off the date. Every player sees the same puzzle. Share-result button copies a 9-column emoji grid (Wordle-style). **Signed-in finishers** land on the leaderboard under the game (see below).
- Mode `endless` — fresh random block every round. Streak / best-streak / wins / losses tracked per-session; no shared leaderboard.

### Pool policy

**Included:** every item a player can place from the creative backpack, across the four inventory-type buckets above. **541 blocks** at the time of writing.

**Excluded:**
- Tool shapesets (`bucket.json`, `mounted_guns.json`, `powertools.json`, `tool_parts.json`) — tools live in dedicated tool slots in-game, not the colored-line backpack, so they don't fit the comparison model.
- Engine / internal shapesets (`characterobject.json`, `character_shape.json`, `debug.json`, `blocks_blueprint.json`, `destructable_tape.json`, `effect_proxies.json`, `override.json`, `challenge.json`).
- Entries without an English `inventoryDescriptions` title or whose title looks internal (`obj_…` / `blk_…` / `jnt_…` / `part_…` / `$…` prefix).
- Entries missing any of `density` / `durability` / `friction` / `buoyancy` — can't be scored fairly.
- Entries without an icon in the atlas — can't render as a guess row.

### Duplicate-title dedupe

Some items share the exact same `inventoryDescriptions` title across multiple UUIDs — notably the five Craftbot upgrade tiers (all labeled "Craftbot") and two Warehouse Spotlight variants. Leaving them as independent pool entries makes the autocomplete show five indistinguishable rows and silently picks a different secret behind each, which is just bad UX. The extractor collapses duplicate titles after collection, keeping the first occurrence (lowest-quality tier by shapeset insertion order).

### Input tolerance

Both the client autocomplete and the server `blockByName` lookup normalise queries by stripping all non-alphanumeric characters before comparing. So "Craft Bot", "craft-bot", "CRAFTBOT" all resolve to "Craftbot" — otherwise a player who typed a space in a one-word name would hit `unknown_block` for no obvious reason.

## Data source

The block database comes from a local Scrap Mechanic install. Three data roots resolve via the `$GAME_DATA` / `$SURVIVAL_DATA` / `$CHALLENGE_DATA` prefixes in shapeset path strings:

- `$GAME_DATA` → `Data/` (creative blocks, interactive parts, decor, lights, …)
- `$SURVIVAL_DATA` → `Survival/` (resources, harvests, components, survival objects)
- `$CHALLENGE_DATA` → `ChallengeData/` (challenge overrides)

`Data/Objects/Database/shapesets.json` lists the shapeset files the game's engine loads at boot. It uses JSON-with-comments — the extractor strips `//` lines before parsing.

### Shapeset coverage

The manifest is **not exhaustive**. Several shapesets are loaded through alternate code paths (the crafting-station object loader, the consumable-inventory system, the plant spawner) and never appear in `shapeSetList`. The extractor walks the manifest **plus an explicit extras list** so they still land:

```
consumable.json          — Survival food / ammo (pizzaburger, chemicals, …)
cookbot.json             — Cook Bot
interactivecontainers.json — Battery / Water / Gas / Potato-Ammo containers
outfitpackage.json       — Outfits
packingcrates.json       — Packing Crates
plantables.json          — Seeds
scrapinteractables.json  — Scrap interactables
survivalobject.json      — Keycard and other survival statics
```

Without these, Consumables would show 7 items instead of 44, and Craftbot / Cookbot / seeds wouldn't appear in autocomplete.

### Block fields

`blockList` (textured cubes) and `partList` (3D-model parts) entries both carry:

- `uuid` — identifier
- `name` — internal short name (`blk_concrete1`, `obj_light_headlight`) — not shown to the player
- `color` — hex tint (visual, not compared)
- `physicsMaterial` — one of the 14 values above (some entries carry obscure values which the extractor normalises to `Other` and logs under `--strict`)
- `ratings: { density, durability, friction, buoyancy }` — 1–10 each
- `flammable: boolean`

Part-only conditional fields (not used as guess axes, but sometimes diagnostic):

- `consumable: true` / `edible: { hpGain, foodGain, waterGain }` — per-entry consumable flag. Promotes the item to `Inventory Type = Consumables` even if its shapeset isn't consumable-typed.
- `qualityLevel` — upgrade tier for upgradeable parts (bearings, suspensions).
- Shape: `box.{x,y,z}` | `cylinder.{diameter, depth}` | `hull.{x,y,z}`.
- Capability markers: `bearing`, `spring`, `piston`, `thruster`, `engine`, `seat`, `controller`, `logicGate`, `spotlight`, `pointLight`, `button`, `switch`, `horn`, `scripted`, …

### Inventory-type detection

Inventory Type is driven **primarily by the shapeset filename**, not by scanning for capability fields. An earlier field-driven approach false-positive'd on ~350 non-interactive parts because `sticky` (every placeable has it) and `itemStack` / `scripted` (harvestables use them) triggered the "Interactive" classification. The shapeset mapping in `INVENTORY_TYPE_FOR_SHAPESET` is exhaustive for every currently-loaded shapeset:

- **Blocks** — `blocks.json`, `wedges.shapeset`
- **Interactive Parts** — `interactive.json`, `interactive_shared.json`, `interactive_upgradeable.json`, `interactivecontainers.json`, `interactivecontainers_shared.json`, `scrapinteractables.json`, `beacon.json`, `craftbot.json`, `cookbot.json`, `vacumpipe.json`, `lights.json`, `vehicle.json`
- **Consumables** — `consumable.json`, `consumable_shared.json`, `outfitpackage.json`, `packingcrates.json`, `plantables.json` (plus any entry with `consumable: true` or `edible` in a non-consumable shapeset)
- **Parts** — everything else (decor, fittings, industrial, spaceship, plants, containers, resources, harvests, worldgen, shooting range, survival objects, component / tree / stone / robot parts)

### Titles

Merged from three language files, `Data/Gui/Language/English` first-wins:

- `Data/Gui/Language/English/InventoryItemDescriptions.json` (creative items)
- `Survival/Gui/Language/English/inventoryDescriptions.json` (survival items)
- `ChallengeData/Gui/Language/English/inventoryDescriptions.json` (challenge overrides)

Entries without a title in any of the three files, or whose title matches the `obj_` / `blk_` / `jnt_` / `part_` / `$` internal prefix, are dropped.

### Level / tier detection

Many block families use trailing integers in titles to mark tier ("Metal Block 1".."Metal Block 5", "Concrete Block 1"..3, "Driver's Saddle 1"..3, etc.). The extractor groups blocks by stripped base name (`/^(.+?)\s+(\d+)$/`). A group counts as a tier family only when it has **≥2 members with a contiguous 1..N range** — this prevents false positives on titles like "Half-Life 2" where the trailing digit isn't a tier marker.

Blocks in a tier family get `{ level, maxLevel }`. Non-tier blocks get `{ level: null, maxLevel: null }` and render `✗` in the Level column.

### Icons

Three 96×96-tile sprite atlas pairs (`.png` + `.xml` index), combined first-wins:

- `Data/Gui/IconMap.png` / `.xml` (base creative set)
- `Survival/Gui/IconMapSurvival.png` / `.xml` (largest — ~660 entries)
- `ChallengeData/Gui/IconMapChallenge.png` / `.xml`

The extractor reads `<Index name="uuid"><Frame point="x y"/>` entries and slices tiles via `jimp` (extractor-only devDep, no native build step). Blocks whose UUID isn't in any atlas are silently dropped.

## Pipeline

Mirrors Scrapcha's private-repo + build-fetch pattern (see `docs/captcha.md`).

**1. Extract once, locally:**

```
npx tsx scripts/extract-blockdle-data.ts \
  --sm "<your Scrap Mechanic install root>" \
  --out ./blockdle-data-tmp
```

Or set `SM_INSTALL_DIR` once and drop the flag. Writes `blocks.json` + `icons/<uuid>.png`. `--strict` makes the extractor exit non-zero on any unmapped shapeset file or unknown `physicsMaterial` value — useful when the game updates.

**2. Upload the output** to a private GitHub repo (e.g. `catlandia/blockdle-data`). Root-level `blocks.json` + an `icons/` directory. Game assets are Facepunch IP — they don't belong in this repo.

**3. Create a fine-grained PAT** with `Contents: Read` scoped only to that repo. GitHub doesn't expose fine-grained token creation via API, so this step is always manual (web UI).

**4. Set env vars** in Vercel (Production + Preview + Development) and `.env.local` for dev:

- `BLOCKDLE_DATA_TOKEN` — the PAT (mark as Sensitive in Vercel)
- `BLOCKDLE_DATA_REPO` — `owner/repo`
- `BLOCKDLE_DATA_BRANCH` — default `main`
- `BLOCKDLE_DATA_PATH` — leave empty if `blocks.json` is at the repo root

**5. Build.** The npm `build` script chains `scripts/fetch-blockdle-data.ts` before `next build`. The fetch pulls `blocks.json` + every `icons/*.png` via the GitHub Contents API and writes three gitignored files into `lib/blockdle/`:

- `blocks.generated.ts` — typed `BLOCKS: readonly Block[]`, imported server-side only
- `autocomplete.generated.ts` — slim `INDEX: { uuid, name, nameLower }[]`, safe for the client bundle
- `_icons.generated.json` — `{ uuid: base64-png }` manifest served by the icon route

**Dev escape hatch:** if `BLOCKDLE_DATA_TOKEN` is unset but `lib/blockdle/blocks.json` + `lib/blockdle/icons/*.png` exist on disk (e.g. from a local extractor run), the fetch script regenerates the three files from disk without hitting GitHub.

**Empty-build fallback:** if neither env vars nor an on-disk dataset are available, the fetch script emits empty stubs (`BLOCKS = []`) and the Blockdle page renders a "not configured yet" placeholder instead of crashing the build. Adding the env vars and re-deploying fills everything in on the next build.

## Leaderboard

Daily mode records a row per signed-in finisher. Anonymous players stay anonymous — they don't get written to the table, and they don't see themselves on the board.

**Table:** `blockdle_daily_results`
- `user_id` (FK → `users.steamid`, cascade delete)
- `date_iso_utc` (string "YYYY-MM-DD")
- `guesses_used` (integer, 1..`ATTEMPTS_MAX`)
- `won` (boolean)
- `created_at` (timestamp)
- PK `(user_id, date_iso_utc)`, index on `date_iso_utc`

**Write path:** `recordDailyFinish()` in `actions.ts` fires from `submitBlockdleGuess` the moment the game transitions to `won` or `lost` for a signed-in user in daily mode. Uses `onConflictDoNothing()` so the first terminal submission wins — retries after a crash or a dev-only daily reset can't overwrite the real attempt. Wrapped in try/catch so DB blips can't crash guess submission.

**Read path:** `getTodayLeaderboard(limit = 25)` joins the table against `users` (filtered for not-hard-banned), selects wins only, and sorts by `guesses_used` ASC then `created_at` ASC for deterministic tie-breaking. Rendered by `app/minigames/blockdle/Leaderboard.tsx` as a server component below the game area — updates on navigation since the page is `force-dynamic`.

Endless mode is deliberately not tracked: the answer is locally-chosen random, streak/wins/losses are per-session. A global endless leaderboard would compare apples to oranges.

## Runtime

- `app/minigames/blockdle/page.tsx` — Server Component. Reads `?mode=`. Renders the "not configured" placeholder when `BLOCKS` is empty.
- `app/minigames/blockdle/BlockdleGame.tsx` — Client shell. Imports `INDEX` (not `BLOCKS`) so the answer set never ships to the browser. Wraps the grid in `overflow-x-auto` with a `min-w-[880px]` floor because 11 columns don't fit a phone portrait viewport.
- `app/minigames/blockdle/GuessRow.tsx` — 11-column row (icon + name + 9 attributes).
- `app/minigames/blockdle/AutocompleteInput.tsx` — client-side prefix + substring match against `INDEX`. Strips non-alphanumerics from both query and name so "craft bot" matches "Craftbot".
- `app/minigames/blockdle/actions.ts` — `startBlockdle`, `submitBlockdleGuess`, `resetBlockdle`, `clearEndlessStats`, `getTodayLeaderboard`. Guess validation + comparison + session mutation + leaderboard write all happen server-side.
- `app/minigames/blockdle/Leaderboard.tsx` — Server Component. Renders today's top finishers; passes `LeaderboardEntry[]` in from the server page.
- `app/api/minigames/blockdle/icon/[uuid]/route.ts` — PNG served from `_icons.generated.json`. No session check; icons aren't a cheat vector. `Cache-Control: public, max-age=31536000, immutable`.
- `lib/blockdle/session.ts` — iron-session cookie `smse_blockdle_v3`, 30-day TTL, signed with `SESSION_SECRET`. Holds `{ daily?, endless? }`.

### Session size

The session persists **only `{ answerUuid, guessUuids: string[] }`** — not the full `GuessComparison[]`. The views materialise comparisons from `BLOCKS` + the answer on every render via `compareGuess()`.

Earlier versions stored the full comparisons and hit iron-session's 4 KB cookie limit around guess 4 (each `GuessComparison` is ~500 bytes with the 9-attribute payload; 7 attempts × ~500 bytes × encryption overhead > 4 KB). Users saw the generic "unexpected error" page. The UUID-only design is ~260 bytes worst case and future-proof against attribute additions.

The cookie name was bumped `smse_blockdle` → `_v2` → `_v3` across V8.12 to drop any in-flight session with the old fat shape.

## Files

```
lib/blockdle/
  types.ts                   — Block, GuessComparison, InventoryType, BlockCategory, …
  pick.ts                    — FNV-1a, todayUtcIso, pickDailyBlock, pickRandomBlock
  compare.ts                 — compareGuess, isWinningComparison
  session.ts                 — iron-session config (smse_blockdle_v3)
  share.ts                   — buildShareGrid (emoji copy-string, 9 cells per row)
  blocks.generated.ts        (gitignored)
  autocomplete.generated.ts  (gitignored)
  _icons.generated.json      (gitignored)
  blocks.json                (gitignored, dev escape hatch)
  icons/<uuid>.png           (gitignored, dev escape hatch)

scripts/
  extract-blockdle-data.ts   — local CLI, run against SM install
  fetch-blockdle-data.ts     — prebuild hook, pulls from private repo

app/minigames/blockdle/
  page.tsx
  BlockdleGame.tsx
  GuessRow.tsx
  AutocompleteInput.tsx
  Leaderboard.tsx
  actions.ts

app/api/minigames/blockdle/icon/[uuid]/
  route.ts
```

## Threat model

- **Answer leakage.** `BLOCKS` (the server catalogue) never imports into a Client Component — only `INDEX` does. Icons are served via an API route and aren't addressable by internal `name` (the engine's placeholder). A determined attacker could still diff the base64 icon manifest for today's hash, but the daily seed salt (`blockdle-v2` in `pick.ts`) can be bumped any time to re-roll every past and future day without any other state change.
- **Replay abuse on daily.** Once a player finishes today's puzzle, `resetBlockdle("daily")` in production is a no-op (gated behind `NODE_ENV !== "production"`). The player can only retry on the next UTC day.
- **Rate limits.** None for MVP. Add if scripted-guess abuse shows up — Scrapcha's approach is the reference.

## Game updates

When SM ships an update that adds blocks:

1. Re-run the extractor with `--strict` to catch new `physicsMaterial` values, unmapped shapeset files, or a newly-added shapeset in the manifest.
2. If `--strict` flags something, update `CATEGORY_FOR_FILE`, `INVENTORY_TYPE_FOR_SHAPESET`, `MATERIAL_ALIASES`, or `EXTRA_SHAPESETS` as needed.
3. Overwrite the private `blockdle-data` repo with the new `blocks.json` + `icons/`.
4. Push any commit to trigger a Vercel rebuild — `fetch-blockdle-data` re-generates, `next build` picks up the new catalogue automatically.
