# Blockdle

The second minigame. A Loldle / Pokedle-style puzzle where the player guesses a secret Scrap Mechanic block from its in-game stats. Six tries, colour-coded feedback.

Route: `/minigames/blockdle?mode=daily|endless` (default: `daily`).

## Game rules

- Six attempts per puzzle.
- Each guess is a block picked from the full SM catalogue (autocomplete off the name index).
- The server reveals per-attribute feedback:
  - **Category** and **Material** — green if the guess matches the answer, red otherwise.
  - **Durability / Density / Friction / Buoyancy** (1–10) — green if equal; otherwise red with `↑` when the answer is higher and `↓` when lower.
- Mode `daily` — one shared secret per UTC day, seeded off the date. Everyone sees the same puzzle. Share-result button copies an emoji grid.
- Mode `endless` — fresh random block every round. Streak / best / wins / losses tracked.

## Data source

The block database comes from the user's local Scrap Mechanic install. There are three data roots referenced in `Data/Objects/Database/shapesets.json` (which uses JSON-with-comments — the extractor strips `//` lines before parsing):

- `$GAME_DATA` → `Data/` (creative blocks, interactive parts, decor, lights, …)
- `$SURVIVAL_DATA` → `Survival/` (resources, harvests, components, upgradeables)
- `$CHALLENGE_DATA` → `ChallengeData/` (challenge overrides)

**Blocks / parts** live in `<root>/Objects/Database/ShapeSets/*.json` as either `blockList` (textured blocks) or `partList` (joints, lights, interactive, …). Every record carries `uuid`, `physicsMaterial`, and `ratings: { density, durability, friction, buoyancy }`.

**User-facing titles** merge two files:
- `Data/Gui/Language/English/InventoryItemDescriptions.json` (creative items)
- `Survival/Gui/Language/English/inventoryDescriptions.json` (survival items)
Entries whose title looks like an internal placeholder (`obj_…`, `blk_…`, `jnt_…`) are dropped from the guess pool.

**Category** is derived from the shapeset filename the block lives in — the game doesn't tag blocks with a string category. See `scripts/extract-blockdle-data.ts` for the full mapping.

**Icons** come from three sprite atlases (96×96 tiles, uuid-keyed via the matching XML):
- `Data/Gui/IconMap.png` / `.xml` (base creative set)
- `Survival/Gui/IconMapSurvival.png` / `.xml` (largest — 660-ish entries)
- `ChallengeData/Gui/IconMapChallenge.png` / `.xml`

## Pipeline

Mirrors Scrapcha's private-repo + build-fetch pattern (see `docs/captcha.md`).

**1. Extract once, locally:**
```
npx tsx scripts/extract-blockdle-data.ts \
  --sm "D:/SteamLibrary/steamapps/common/Scrap Mechanic" \
  --out ./blockdle-data-tmp
```
Writes `blocks.json` + `icons/<uuid>.png`. No Windows paths in the output. `--strict` makes the extractor exit non-zero on any unmapped shapeset file or unknown `physicsMaterial` value — useful when the game updates.

**2. Upload the output** to a private GitHub repo (e.g. `catlandia/blockdle-data`). Root-level `blocks.json` + an `icons/` directory.

**3. Create a fine-grained PAT** with `Contents: Read` on just that repo.

**4. Set env vars** in Vercel (and `.env.local` for dev):
- `BLOCKDLE_DATA_TOKEN` — the PAT
- `BLOCKDLE_DATA_REPO` — `owner/repo`
- `BLOCKDLE_DATA_BRANCH` — default `main`
- `BLOCKDLE_DATA_PATH` — leave empty if `blocks.json` is at the repo root

**5. Build.** The npm `build` script chains `scripts/fetch-blockdle-data.ts` before `next build`. The fetch script pulls `blocks.json` + every `icons/*.png`, and writes three gitignored files into `lib/blockdle/`:
- `blocks.generated.ts` — full `BLOCKS: Block[]`, imported server-side only
- `autocomplete.generated.ts` — slim `INDEX: { uuid, name, nameLower }[]`, safe for the client bundle
- `_icons.generated.json` — `{ uuid: base64-png }` manifest served by the icon route

Dev escape hatch: if `BLOCKDLE_DATA_TOKEN` is unset but `lib/blockdle/blocks.json` + `lib/blockdle/icons/*.png` exist on disk (e.g. from a local extractor run), the fetch script regenerates the three files from disk.

## Runtime

- `app/minigames/blockdle/page.tsx` — Server Component. Reads `?mode=`.
- `app/minigames/blockdle/BlockdleGame.tsx` — Client shell. Imports `INDEX` (not `BLOCKS`) so the answer set never ships to the browser.
- `app/minigames/blockdle/actions.ts` — `startBlockdle`, `submitBlockdleGuess`, `resetBlockdle`, `clearEndlessStats`. Guess validation + comparison + session mutation all happen server-side.
- `app/api/minigames/blockdle/icon/[uuid]/route.ts` — PNG served from `_icons.generated.json`. No session check; icons aren't a cheat vector. `Cache-Control: public, max-age=31536000, immutable`.
- `lib/blockdle/session.ts` — iron-session cookie `smse_blockdle`, 30-day TTL, signed with `SESSION_SECRET`. Holds `{ daily?, endless? }` so a single cookie covers both modes.

## Files

```
lib/blockdle/
  types.ts
  pick.ts            — FNV-1a, todayUtcIso, pickDailyBlock, pickRandomBlock
  compare.ts         — compareGuess, isWinningComparison
  session.ts         — iron-session config
  share.ts           — buildShareGrid (emoji copy-string)
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
  actions.ts

app/api/minigames/blockdle/icon/[uuid]/
  route.ts
```

## Threat model

- **Answer leakage.** `BLOCKS` (the server catalogue) never imports into a Client Component — only `INDEX` does. Icons are served via an API route and aren't addressable by internal `name` (the engine's placeholder). A determined attacker could still diff the base64 manifest for today's hash, but the daily seed salt (`blockdle-v1` in `pick.ts`) can be bumped to re-roll everything.
- **Replay abuse on daily.** Once a player finishes today's puzzle, `resetBlockdle("daily")` in production is a no-op (gated behind `NODE_ENV !== "production"`). The player can only retry on the next UTC day.
- **Rate limits.** None for MVP. Add if scripted-guess abuse shows up — Scrapcha's approach is the reference.

## Game updates

When SM ships an update that adds blocks:
1. Re-run the extractor (`--strict` to catch new `physicsMaterial` values or shapeset files).
2. Overwrite the private repo.
3. Push to trigger a Vercel rebuild — `fetch-blockdle-data` re-generates, `next build` picks up the new catalogue.
