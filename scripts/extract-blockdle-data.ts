// One-shot extractor. Point it at a local Scrap Mechanic install, pulls
// every user-visible block / part with its in-game handbook stats + icon,
// and emits:
//   <out>/blocks.json         — sorted by title, one record per block
//   <out>/icons/<uuid>.png    — 96x96 tiles sliced from the game atlases
//
// The user then commits <out> to a separate private GitHub repo; the public
// repo's build-time fetch script pulls the data back in.
//
// Usage:
//   npx tsx scripts/extract-blockdle-data.ts \
//     --sm "<your SM install root>" \
//     --out ./blockdle-data-tmp
//
// --strict   exit non-zero on any unmapped material / category
// --sm       SM install root (default: env SM_INSTALL_DIR)
// --out      output directory (default: ./blockdle-data-tmp)

import fs from "node:fs/promises";
import path from "node:path";
import { Jimp } from "jimp";

// ---------- CLI ----------

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}

const SM_ROOT = arg("sm", process.env.SM_INSTALL_DIR);
const OUT_DIR = path.resolve(process.cwd(), arg("out", "./blockdle-data-tmp")!);
const STRICT = process.argv.includes("--strict");

if (!SM_ROOT) {
  console.error("error: --sm <Scrap Mechanic install root> is required");
  console.error("       (or set SM_INSTALL_DIR env var)");
  process.exit(1);
}

const smRoot = path.resolve(SM_ROOT);

// ---------- Helpers ----------

// shapesets.json uses JSON with // comments. Strip them before parsing.
function parseJsonc<T = unknown>(raw: string): T {
  const stripped = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^(\s*)\/\/.*$/, "$1"))
    .join("\n");
  return JSON.parse(stripped) as T;
}

function resolvePath(p: string): string {
  return p
    .replace(/^\$GAME_DATA/, path.join(smRoot, "Data"))
    .replace(/^\$SURVIVAL_DATA/, path.join(smRoot, "Survival"))
    .replace(/^\$CHALLENGE_DATA/, path.join(smRoot, "ChallengeData"))
    .replace(/\\/g, "/");
}

async function readText(p: string): Promise<string> {
  return fs.readFile(p, "utf8");
}

// ---------- Category mapping (shapeset filename → category) ----------

type Category =
  | "Blocks"
  | "Fittings"
  | "Spaceship Parts"
  | "Decorations"
  | "Plants"
  | "Lights"
  | "Interactive Parts"
  | "Interactive Containers"
  | "Scrap Interactables"
  | "Containers"
  | "Vehicle Parts"
  | "Industrial Parts"
  | "Consumables"
  | "Outfits"
  | "Packing Crates"
  | "Components"
  | "Resources"
  | "Harvestables"
  | "Tree Parts"
  | "Stone Parts"
  | "Robot Parts"
  | "Survival Objects"
  | "Worldgen Structures";

// null = skip (not user-facing / internal / tool-adjacent per the design).
const CATEGORY_FOR_FILE: Record<string, Category | null> = {
  "blocks.json": "Blocks",
  "fittings.json": "Fittings",
  "spaceship.json": "Spaceship Parts",
  "decor.json": "Decorations",
  "plants.json": "Plants",
  "lights.json": "Lights",
  "interactive.json": "Interactive Parts",
  "interactive_shared.json": "Interactive Parts",
  "interactive_upgradeable.json": "Interactive Parts",
  "interactivecontainers.json": "Interactive Containers",
  "interactivecontainers_shared.json": "Interactive Containers",
  "scrapinteractables.json": "Scrap Interactables",
  "containers.json": "Containers",
  "vehicle.json": "Vehicle Parts",
  "industrial.json": "Industrial Parts",
  "consumable.json": "Consumables",
  "consumable_shared.json": "Consumables",
  "outfitpackage.json": "Outfits",
  "packingcrates.json": "Packing Crates",
  "component.json": "Components",
  "resources.json": "Resources",
  "harvests.json": "Harvestables",
  "treeparts.json": "Tree Parts",
  "stoneparts.json": "Stone Parts",
  "robotparts.json": "Robot Parts",
  "construction.json": "Worldgen Structures",
  "building.json": "Worldgen Structures",
  "warehouse.json": "Worldgen Structures",
  "manmade.json": "Worldgen Structures",
  "wedges.shapeset": "Blocks",

  // Re-included in V8.12 hotfix — these are all creative-inventory-visible
  // items that earlier I wrongly skipped as "engine internals".
  "beacon.json": "Interactive Parts",
  "craftbot.json": "Interactive Parts",
  "cookbot.json": "Interactive Parts",
  "plantables.json": "Consumables",
  "shootingrange.json": "Decorations",
  "vacumpipe.json": "Industrial Parts",
  "survivalobject.json": "Survival Objects",

  // Explicit skip — tools (per design) and engine / internal / worldgen-only.
  "bucket.json": null,
  "mounted_guns.json": null,
  "powertools.json": null,
  "tool_parts.json": null,
  "characterobject.json": null,
  "character_shape.json": null,
  "debug.json": null,
  "blocks_blueprint.json": null,
  "destructable_tape.json": null,
  "effect_proxies.json": null,
  "override.json": null,
  "challenge.json": null,
};

function categoryFor(file: string): Category | null | undefined {
  const base = path.basename(file).toLowerCase();
  if (base in CATEGORY_FOR_FILE) return CATEGORY_FOR_FILE[base];
  return undefined;
}

// ---------- Material normalisation ----------

type Material =
  | "Mechanical"
  | "Metal"
  | "Wood"
  | "Plastic"
  | "Cardboard"
  | "Plant"
  | "Grass"
  | "Fruit"
  | "Stone"
  | "Rock"
  | "Sand"
  | "Rubber"
  | "Gum"
  | "Glass"
  | "Other";

const MATERIAL_ALIASES: Record<string, Material> = {
  mechanical: "Mechanical",
  metal: "Metal",
  wood: "Wood",
  plastic: "Plastic",
  cardboard: "Cardboard",
  plant: "Plant",
  grass: "Grass",
  fruit: "Fruit",
  stone: "Stone",
  rock: "Rock",
  sand: "Sand",
  rubber: "Rubber",
  gum: "Gum",
  glass: "Glass",
};

const unknownMaterials = new Set<string>();

function normaliseMaterial(raw: string | undefined): Material {
  if (!raw) return "Other";
  const key = raw.toLowerCase();
  const hit = MATERIAL_ALIASES[key];
  if (hit) return hit;
  unknownMaterials.add(raw);
  return "Other";
}

// ---------- Inventory-type detection ----------

type InventoryType =
  | "Blocks"
  | "Interactive Parts"
  | "Parts"
  | "Consumables";

// Any of these fields on a partList entry marks it as "Interactive" — the
// orange-line bucket in the backpack. The set mirrors what the game's UI
// hardcodes; keeping it data-driven (presence of the field) means new
// capability markers added in a future update at least get flagged.
const INTERACTIVE_CAPABILITY_FIELDS = [
  "bearing",
  "spring",
  "piston",
  "thruster",
  "engine",
  "seat",
  "controller",
  "logicGate",
  "timer",
  "sensor",
  "button",
  "switch",
  "spotlight",
  "pointLight",
  "horn",
  "tone",
  "radio",
  "chest",
  "itemStack",
  "scripted",
  "glowEffect",
  "chemistryDispenser",
  "sticky",
];

// Shapeset files that should always classify as Consumable regardless of
// the per-entry `consumable` flag (some entries in these files don't set
// it, but are still survival consumables by category).
const CONSUMABLE_SHAPESETS = new Set([
  "consumable.json",
  "consumable_shared.json",
  "plantables.json",
]);

function detectInventoryType(args: {
  listType: "block" | "part";
  entry: Record<string, unknown>;
  shapesetBase: string;
  category: Category;
}): InventoryType {
  const { listType, entry, shapesetBase } = args;

  // Consumable is highest priority — an edible item in an interactive-looking
  // shapeset should still show as Consumable to the player.
  if (
    entry.consumable === true ||
    entry.edible != null ||
    CONSUMABLE_SHAPESETS.has(shapesetBase) ||
    shapesetBase === "outfitpackage.json" ||
    shapesetBase === "packingcrates.json"
  ) {
    return "Consumables";
  }

  if (listType === "block") return "Blocks";

  for (const f of INTERACTIVE_CAPABILITY_FIELDS) {
    if (entry[f] != null) return "Interactive Parts";
  }

  return "Parts";
}

// ---------- Title filtering + level parsing ----------

// Internal names the game never shows the user. If an inventoryDescriptions
// title looks like one of these, drop the block from the guess pool.
function looksInternal(title: string): boolean {
  return /^(obj_|blk_|jnt_|part_|\$)/i.test(title.trim());
}

// Split "Metal Block 3" into { base: "Metal Block", level: 3 }. Anything
// without a trailing integer returns { base: title, level: null }.
function splitLevel(title: string): { base: string; level: number | null } {
  const m = title.match(/^(.+?)\s+(\d+)$/);
  if (!m) return { base: title, level: null };
  const level = parseInt(m[2], 10);
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    return { base: title, level: null };
  }
  return { base: m[1].trim(), level };
}

// Walk the collected blocks, group by stripped base name, and annotate each
// entry with { level, maxLevel } if the group forms a contiguous 1..N run of
// at least 2 members. Singletons and non-contiguous groups (e.g. only
// "Half-Life 2" with no "Half-Life 1") get level=null so false-positive
// numeric tails don't accidentally become tier attributes.
function assignLevels<T extends { title: string }>(
  items: T[],
): Map<T, { level: number | null; maxLevel: number | null }> {
  const out = new Map<T, { level: number | null; maxLevel: number | null }>();
  const byBase = new Map<string, Array<{ item: T; level: number }>>();
  for (const item of items) {
    const { base, level } = splitLevel(item.title);
    if (level == null) {
      out.set(item, { level: null, maxLevel: null });
      continue;
    }
    const list = byBase.get(base) ?? [];
    list.push({ item, level });
    byBase.set(base, list);
  }
  for (const [, members] of byBase) {
    if (members.length < 2) {
      for (const m of members) out.set(m.item, { level: null, maxLevel: null });
      continue;
    }
    const levels = members.map((m) => m.level).sort((a, b) => a - b);
    let contiguous = true;
    for (let i = 0; i < levels.length; i += 1) {
      if (levels[i] !== i + 1) {
        contiguous = false;
        break;
      }
    }
    if (!contiguous) {
      for (const m of members) out.set(m.item, { level: null, maxLevel: null });
      continue;
    }
    const maxLevel = levels[levels.length - 1];
    for (const m of members) out.set(m.item, { level: m.level, maxLevel });
  }
  return out;
}

// ---------- Atlas slicing ----------

type AtlasEntry = { atlasFile: string; x: number; y: number };

async function loadAtlas(xmlPath: string): Promise<Map<string, AtlasEntry>> {
  const raw = await readText(xmlPath);
  const atlasDir = path.dirname(xmlPath);
  const textureMatch = raw.match(/texture="([^"]+)"/);
  if (!textureMatch) throw new Error(`no texture attribute in ${xmlPath}`);
  const atlasFile = path.join(atlasDir, textureMatch[1]);

  const map = new Map<string, AtlasEntry>();
  const indexRe = /<Index\s+name="([^"]+)">[\s\S]*?<Frame\s+point="(\d+)\s+(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = indexRe.exec(raw)) !== null) {
    const name = m[1];
    if (name === "Empty") continue;
    map.set(name, { atlasFile, x: parseInt(m[2], 10), y: parseInt(m[3], 10) });
  }
  return map;
}

const ICON_SIZE = 96;

type AtlasSource = { name: string; xmlPath: string };

async function buildIconIndex(sources: AtlasSource[]): Promise<Map<string, AtlasEntry>> {
  const merged = new Map<string, AtlasEntry>();
  for (const src of sources) {
    try {
      const entries = await loadAtlas(src.xmlPath);
      for (const [uuid, entry] of entries) {
        // First atlas wins — base game atlas is scanned first, then
        // Survival overrides if it redefines the same uuid.
        if (!merged.has(uuid)) merged.set(uuid, entry);
      }
      console.log(`  [icons] ${src.name}: ${entries.size} entries`);
    } catch (err) {
      console.warn(`  [icons] failed to load ${src.name}:`, err instanceof Error ? err.message : err);
    }
  }
  return merged;
}

async function sliceAtlasIcons(
  iconIndex: Map<string, AtlasEntry>,
  neededUuids: Set<string>,
  outDir: string,
): Promise<number> {
  // Group needed slices by atlas so we only load each PNG once.
  const byAtlas = new Map<string, Array<{ uuid: string; x: number; y: number }>>();
  for (const uuid of neededUuids) {
    const entry = iconIndex.get(uuid);
    if (!entry) continue;
    const list = byAtlas.get(entry.atlasFile) ?? [];
    list.push({ uuid, x: entry.x, y: entry.y });
    byAtlas.set(entry.atlasFile, list);
  }

  let written = 0;
  for (const [atlasFile, slices] of byAtlas) {
    const atlas = await Jimp.read(atlasFile);
    console.log(`  [icons] slicing ${slices.length} from ${path.basename(atlasFile)} (${atlas.width}x${atlas.height})`);
    for (const s of slices) {
      const tile = atlas.clone().crop({ x: s.x, y: s.y, w: ICON_SIZE, h: ICON_SIZE });
      const buf = await tile.getBuffer("image/png");
      await fs.writeFile(path.join(outDir, `${s.uuid}.png`), buf);
      written += 1;
    }
  }
  return written;
}

// ---------- Main ----------

type ShapeSetEntry = {
  uuid: string;
  name?: string;
  physicsMaterial?: string;
  flammable?: boolean;
  consumable?: boolean;
  edible?: unknown;
  ratings?: {
    density?: number;
    durability?: number;
    friction?: number;
    buoyancy?: number;
  };
  [key: string]: unknown;
};

async function main() {
  console.log(`SM root:  ${smRoot}`);
  console.log(`Out dir:  ${OUT_DIR}`);

  // 1. Parse shapesets.json manifest.
  const manifestPath = path.join(smRoot, "Data/Objects/Database/shapesets.json");
  const manifestRaw = await readText(manifestPath);
  const manifest = parseJsonc<{ shapeSetList: string[] }>(manifestRaw);
  console.log(`shapesets.json: ${manifest.shapeSetList.length} entries`);

  // 2. Merge both English inventoryDescriptions files into one uuid → title map.
  const titles = new Map<string, string>();
  const addTitles = async (p: string) => {
    try {
      const raw = await readText(p);
      const data = JSON.parse(raw) as Record<string, { title?: string }>;
      let added = 0;
      for (const [uuid, entry] of Object.entries(data)) {
        if (entry?.title && !titles.has(uuid)) {
          titles.set(uuid, entry.title);
          added += 1;
        }
      }
      console.log(`  [titles] ${path.basename(path.dirname(p))}/${path.basename(p)}: +${added}`);
    } catch (err) {
      console.warn(`  [titles] skipped ${p}:`, err instanceof Error ? err.message : err);
    }
  };
  await addTitles(path.join(smRoot, "Data/Gui/Language/English/InventoryItemDescriptions.json"));
  await addTitles(path.join(smRoot, "Survival/Gui/Language/English/inventoryDescriptions.json"));
  await addTitles(path.join(smRoot, "ChallengeData/Gui/Language/English/inventoryDescriptions.json"));

  // 3. Iterate every shapeset and collect stat records.
  type Collected = {
    uuid: string;
    title: string;
    inventoryType: InventoryType;
    category: Category;
    material: Material;
    flammable: boolean;
    level: number | null;
    maxLevel: number | null;
    durability: number;
    density: number;
    friction: number;
    buoyancy: number;
  };
  const collected = new Map<string, Collected>();
  let skippedUnmapped = 0;
  let skippedInternalName = 0;
  let skippedNoTitle = 0;
  let skippedNoRatings = 0;
  const unmappedFiles = new Set<string>();

  for (const rawPath of manifest.shapeSetList) {
    const resolved = resolvePath(rawPath);
    const category = categoryFor(resolved);
    if (category === null) continue;
    if (category === undefined) {
      unmappedFiles.add(path.basename(resolved));
      skippedUnmapped += 1;
      continue;
    }

    let shapeset: { blockList?: ShapeSetEntry[]; partList?: ShapeSetEntry[] };
    try {
      const raw = await readText(resolved);
      shapeset = parseJsonc(raw);
    } catch (err) {
      console.warn(`  [shapeset] skip ${path.basename(resolved)}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const shapesetBase = path.basename(resolved).toLowerCase();
    const lists: Array<{ list: ShapeSetEntry[]; listType: "block" | "part" }> = [
      { list: shapeset.blockList ?? [], listType: "block" },
      { list: shapeset.partList ?? [], listType: "part" },
    ];

    for (const { list, listType } of lists) {
      for (const e of list) {
        if (!e.uuid) continue;
        if (collected.has(e.uuid)) continue;

        const title = titles.get(e.uuid);
        if (!title) {
          skippedNoTitle += 1;
          continue;
        }
        if (looksInternal(title)) {
          skippedInternalName += 1;
          continue;
        }
        const r = e.ratings;
        if (
          !r ||
          typeof r.density !== "number" ||
          typeof r.durability !== "number" ||
          typeof r.friction !== "number" ||
          typeof r.buoyancy !== "number"
        ) {
          skippedNoRatings += 1;
          continue;
        }

        collected.set(e.uuid, {
          uuid: e.uuid,
          title,
          inventoryType: detectInventoryType({
            listType,
            entry: e as Record<string, unknown>,
            shapesetBase,
            category,
          }),
          category,
          material: normaliseMaterial(e.physicsMaterial),
          flammable: e.flammable === true,
          // Level fields filled in by the second pass below — we need the
          // full collection in memory to detect contiguous tier families.
          level: null,
          maxLevel: null,
          durability: r.durability,
          density: r.density,
          friction: r.friction,
          buoyancy: r.buoyancy,
        });
      }
    }
  }

  // Dedupe by title — some items (Craftbot upgrade tiers, Warehouse
  // Spotlight variants) share the exact same InventoryItemDescriptions
  // title. In the game the player only ever sees one "Craftbot" icon
  // in the backpack; rendering five identical-looking autocomplete rows
  // and silently picking different secrets behind them is a bad puzzle.
  // Keep the first occurrence (lowest qualityLevel / earliest in the
  // shapeset, since collection order is deterministic).
  {
    const seenTitles = new Set<string>();
    for (const [uuid, item] of collected) {
      const key = item.title.toLowerCase();
      if (seenTitles.has(key)) collected.delete(uuid);
      else seenTitles.add(key);
    }
  }

  // Second pass: tier-family detection across every collected block.
  const levelMap = assignLevels(Array.from(collected.values()));
  let tierMembers = 0;
  for (const item of collected.values()) {
    const lv = levelMap.get(item);
    if (lv) {
      item.level = lv.level;
      item.maxLevel = lv.maxLevel;
      if (lv.level != null) tierMembers += 1;
    }
  }

  console.log(
    `\nShapeset pass:  ${collected.size} candidates (skipped ${skippedNoTitle} no-title, ${skippedInternalName} internal-name, ${skippedNoRatings} no-ratings, ${skippedUnmapped} in unmapped files)`,
  );
  console.log(`  Tier-family members: ${tierMembers}`);
  if (unmappedFiles.size > 0) {
    console.log(`  Unmapped shapeset files: ${[...unmappedFiles].join(", ")}`);
  }
  if (unknownMaterials.size > 0) {
    console.log(`  Unknown physicsMaterial values (→ "Other"): ${[...unknownMaterials].join(", ")}`);
  }

  // 4. Load icon atlases + slice the needed tiles.
  const iconSources: AtlasSource[] = [
    { name: "base", xmlPath: path.join(smRoot, "Data/Gui/IconMap.xml") },
    { name: "survival", xmlPath: path.join(smRoot, "Survival/Gui/IconMapSurvival.xml") },
    { name: "challenge", xmlPath: path.join(smRoot, "ChallengeData/Gui/IconMapChallenge.xml") },
  ];
  const iconIndex = await buildIconIndex(iconSources);

  // Drop blocks with no icon — guessing them would be a blank tile.
  const needed = new Set<string>();
  let skippedNoIcon = 0;
  for (const [uuid, block] of collected) {
    if (iconIndex.has(uuid)) {
      needed.add(uuid);
    } else {
      collected.delete(uuid);
      skippedNoIcon += 1;
      void block;
    }
  }

  // 5. Write output.
  const iconsOut = path.join(OUT_DIR, "icons");
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(iconsOut, { recursive: true });

  const iconsWritten = await sliceAtlasIcons(iconIndex, needed, iconsOut);

  const blocks = [...collected.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  await fs.writeFile(
    path.join(OUT_DIR, "blocks.json"),
    JSON.stringify(blocks, null, 2),
    "utf8",
  );

  console.log(
    `\nDone. ${blocks.length} blocks, ${iconsWritten} icons. Skipped ${skippedNoIcon} (no icon).`,
  );
  console.log(`Output: ${OUT_DIR}`);

  if (STRICT && (unmappedFiles.size > 0 || unknownMaterials.size > 0)) {
    console.error("\n--strict: unmapped files or materials present; exiting non-zero.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
