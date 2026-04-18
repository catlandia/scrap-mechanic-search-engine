# Auto-Tagger

The tagger is a pure TypeScript rule-based classifier — no API calls, no costs, deterministic and debuggable. It runs once per creation at ingest time and produces tag suggestions for admin review.

---

## Design Philosophy

Avoid any LLM or paid API. The domain is narrow enough (Scrap Mechanic workshop items) that a keyword matcher handles the common cases well. The admin queue is the safety net for everything else. As the admin reviews items, they can expand `keywords.ts` with new aliases, making the tagger progressively smarter over time.

---

## Classification (`lib/tagger/classify.ts`)

### Input

```ts
{
  title: string,
  descriptionClean: string,    // BBCode-stripped
  steamTags: string[],         // raw tags from Steam
}
```

### Output

```ts
TagSuggestion[] = Array<{
  tagSlug: string,
  source: "keyword" | "steam",
  confidence: number,          // 0..1
}>
```

### Scoring

Each canonical tag (from `keywords.ts`) is scored against the input:

```
score = (title matches × 3) + (Steam tag exact matches × 2) + (description matches × 1)
```

Constants:
- `TITLE_WEIGHT = 3`
- `STEAM_TAG_WEIGHT = 2`
- `DESCRIPTION_WEIGHT = 1`
- `SCORE_THRESHOLD = 2` — minimum score to suggest the tag
- `CONFIDENCE_SCALE = 6` — `confidence = min(1.0, score / CONFIDENCE_SCALE)`

Matching is case-insensitive, word-boundary aware (regex `\b` delimiters).

### Step-by-step

1. Normalize: title + clean description + Steam tag names → lowercase
2. For each canonical tag, check all its keyword aliases against title, description, and Steam tags
3. Sum weighted hits
4. If `score >= SCORE_THRESHOLD`, emit a `TagSuggestion`
5. If the item's Steam tags exactly match a known tag slug, also emit a `source="steam"` row (separate from the keyword row, so admin can see provenance)
6. Return results sorted by confidence descending

---

## Keyword Dictionary (`lib/tagger/keywords.ts`)

Maps each canonical tag slug to an array of keyword aliases. Examples:

```ts
car: ["car", "vehicle", "automobile", "sports car", "race car", "buggy", "jeep"],
house: ["house", "home", "cabin", "cottage", "hut", "shack", "shelter"],
cannon: ["cannon", "artillery", "catapult", "ballista"],
walker: ["walker", "mech walker", "legged", "bipedal", "quadruped"],
```

Currently covers ~40 tags across categories:
- **Vehicles:** car, truck, motorcycle, plane, helicopter, boat, submarine, tank, walker, mech, train, spacecraft
- **Buildings:** house, castle, base, shop, farm, bridge, tower
- **Mechanisms:** elevator, crane, door-system, suspension, transmission, turret
- **Weapons:** cannon, gun, missile-launcher, explosive, trap
- **Decoration:** statue, pixel-art, sculpture
- **Logic:** computer, clock, calculator
- **Tools:** printer, transport-tool

### Expanding the dictionary

Add new aliases to `keywords.ts` at any time. Existing approved items will not be re-tagged (the tagger only runs on new inserts). To re-tag old items you would need to run the tagger manually or re-ingest.

---

## Taxonomy (`lib/tagger/taxonomy.ts`)

Single source of truth for categories and their associated canonical tags. Used by:
- `npm run db:seed` to populate `categories` and `tags` tables
- `classify.ts` to know which tags belong to which categories (for inferring `creationCategories`)

Category → tag structure:

```
Vehicle        → car, truck, motorcycle, plane, helicopter, boat, submarine, tank, walker, mech, train, spacecraft
Building       → house, castle, base, shop, farm, bridge, tower
Mechanism      → elevator, crane, door-system, suspension, transmission, turret
Weapon         → cannon, gun, missile-launcher, explosive, trap
Decoration     → statue, pixel-art, sculpture
Logic          → computer, clock, calculator
Tool           → printer, transport-tool
```

### Category inference

When a creation gets a tag, its parent category is automatically added to `creationCategories`. This denormalized table allows fast category filtering in queries without joining through tags.

---

## Where Tags Come From (sources)

Tags in `creationTags` have a `source` field:

| Source | Meaning |
|---|---|
| `keyword` | Tagger matched a keyword alias |
| `steam` | Item had a matching Steam Workshop tag |
| `admin` | Admin manually added the tag |
| `community` | A logged-in user nominated the tag |

The source is displayed in the admin queue so reviewers can understand why a tag was suggested.

---

## Tag Visibility Logic

A tag is visible publicly if:
- `confirmed = true` AND `rejected = false` (admin-confirmed)
- OR `confirmed = false` AND `rejected = false` AND (net community votes ≥ 3)

A tag is permanently hidden if:
- `rejected = true` — set by a creator action, overrides everything

---

## Smoke Test

`scripts/smoke-classify.ts` lets you run the tagger against a sample title + description without hitting the database. Useful for checking that new keyword additions work:

```bash
npx tsx scripts/smoke-classify.ts
```
