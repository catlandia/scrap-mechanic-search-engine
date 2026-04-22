// Shared types for the Blockdle minigame. Pure data shapes — no runtime
// deps on the generated files, so the extractor + build-time fetch scripts
// can import from this module without touching the game catalog.

export type BlockCategory =
  | "Building"
  | "Decoration"
  | "Interactive"
  | "Container"
  | "Vehicle"
  | "Industrial"
  | "Tool"
  | "Consumable"
  | "Resource"
  | "Worldgen";

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
  category: BlockCategory;
  material: BlockMaterial;
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
  guessCategory: BlockCategory;
  guessMaterial: BlockMaterial;
  guessDurability: number;
  guessDensity: number;
  guessFriction: number;
  guessBuoyancy: number;
  cells: {
    category: GuessCellResult;
    material: GuessCellResult;
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

export const ATTEMPTS_MAX = 6;
