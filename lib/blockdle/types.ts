// Shared types for the Blockdle minigame. Pure data shapes — no runtime
// deps on the generated files, so the extractor + build-time fetch scripts
// can import from this module without touching the game catalog.

// Four top-level buckets matching the in-game backpack's colored-line
// categorisation (see HANDBOOK_HOW_TO_PLAY_PAGE3_*_TEXT tags in the game).
export type InventoryType = "Blocks" | "Interactive" | "Parts" | "Consumable";

// Fine-grained category derived from the shapeset filename. The game has
// no explicit category field — these are the shapeset filenames rendered
// as human-readable labels. 22 values after dropping tool-adjacent files.
export type BlockCategory =
  | "Block"
  | "Fitting"
  | "Spaceship"
  | "Decoration"
  | "Plant"
  | "Light"
  | "Interactive"
  | "Interactive Container"
  | "Scrap Interactable"
  | "Container"
  | "Vehicle"
  | "Industrial"
  | "Consumable"
  | "Outfit"
  | "Packing Crate"
  | "Component"
  | "Resource"
  | "Harvest"
  | "Tree Part"
  | "Stone Part"
  | "Robot Part"
  | "Worldgen Structure";

// physicsMaterial values observed in the game's ShapeSets. Kept permissive —
// the extractor normalises unknowns to "Other" and logs a warning so new
// additions are easy to slot in.
export type BlockMaterial =
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

export type Block = {
  uuid: string;
  title: string;
  inventoryType: InventoryType;
  category: BlockCategory;
  material: BlockMaterial;
  flammable: boolean;
  // Null = not part of a tier family. Non-null = the block's tier (1..maxLevel)
  // within a contiguous 1..N family detected from title suffixes like "Metal
  // Block 3" / "Wood Block 5". Comparison is numeric higher/lower/match and
  // treats null vs non-null as a miss.
  level: number | null;
  maxLevel: number | null;
  durability: number;
  density: number;
  friction: number;
  buoyancy: number;
};

export type AutocompleteEntry = {
  uuid: string;
  name: string;
  nameLower: string;
};

export type GuessCellResult =
  | { kind: "match" }
  | { kind: "miss" }
  | { kind: "higher" }
  | { kind: "lower" };

export type GuessComparison = {
  guessUuid: string;
  guessName: string;
  guessInventoryType: InventoryType;
  guessCategory: BlockCategory;
  guessMaterial: BlockMaterial;
  guessFlammable: boolean;
  guessLevel: number | null;
  guessMaxLevel: number | null;
  guessDurability: number;
  guessDensity: number;
  guessFriction: number;
  guessBuoyancy: number;
  cells: {
    inventoryType: GuessCellResult;
    category: GuessCellResult;
    material: GuessCellResult;
    flammable: GuessCellResult;
    level: GuessCellResult;
    durability: GuessCellResult;
    density: GuessCellResult;
    friction: GuessCellResult;
    buoyancy: GuessCellResult;
  };
};

export type GameStats = {
  streak: number;
  bestStreak: number;
  wins: number;
  losses: number;
};

export type GameStatus = "playing" | "won" | "lost";

export type DailyState = {
  dateIsoUtc?: string;
  answerUuid?: string;
  guesses: GuessComparison[];
  status: GameStatus;
};

export type EndlessState = {
  answerUuid?: string;
  guesses: GuessComparison[];
  status: GameStatus;
  stats: GameStats;
};

export type BlockdleSession = {
  daily?: DailyState;
  endless?: EndlessState;
};

export const ATTEMPTS_MAX = 7;
