import type { Block, GuessCellResult, GuessComparison } from "./types";

function textCell<T extends string>(guess: T, answer: T): GuessCellResult {
  return guess === answer ? { kind: "match" } : { kind: "miss" };
}

function boolCell(guess: boolean, answer: boolean): GuessCellResult {
  return guess === answer ? { kind: "match" } : { kind: "miss" };
}

function numCell(guess: number, answer: number): GuessCellResult {
  if (guess === answer) return { kind: "match" };
  return answer > guess ? { kind: "higher" } : { kind: "lower" };
}

// Level: both null → match (neither is in a tier family); exactly one null →
// miss (one of them is tiered and the other isn't); both numeric → numeric
// compare. Note this compares across families — "Metal Block 3" and "Wood
// Block 3" both have level=3, which shows as a match. That's intentional:
// the game's own metal/wood tier systems share the same 1..N semantics, so
// a player who knows "it's tier 3" learns something real.
function levelCell(
  guess: number | null,
  answer: number | null,
): GuessCellResult {
  if (guess === null && answer === null) return { kind: "match" };
  if (guess === null || answer === null) return { kind: "miss" };
  return numCell(guess, answer);
}

export function compareGuess(guess: Block, answer: Block): GuessComparison {
  return {
    guessUuid: guess.uuid,
    guessName: guess.title,
    guessInventoryType: guess.inventoryType,
    guessCategory: guess.category,
    guessMaterial: guess.material,
    guessFlammable: guess.flammable,
    guessLevel: guess.level,
    guessMaxLevel: guess.maxLevel,
    guessDurability: guess.durability,
    guessDensity: guess.density,
    guessFriction: guess.friction,
    guessBuoyancy: guess.buoyancy,
    cells: {
      inventoryType: textCell(guess.inventoryType, answer.inventoryType),
      category: textCell(guess.category, answer.category),
      material: textCell(guess.material, answer.material),
      flammable: boolCell(guess.flammable, answer.flammable),
      level: levelCell(guess.level, answer.level),
      durability: numCell(guess.durability, answer.durability),
      density: numCell(guess.density, answer.density),
      friction: numCell(guess.friction, answer.friction),
      buoyancy: numCell(guess.buoyancy, answer.buoyancy),
    },
  };
}

export function isWinningComparison(c: GuessComparison): boolean {
  const cells = c.cells;
  return (
    cells.inventoryType.kind === "match" &&
    cells.category.kind === "match" &&
    cells.material.kind === "match" &&
    cells.flammable.kind === "match" &&
    cells.level.kind === "match" &&
    cells.durability.kind === "match" &&
    cells.density.kind === "match" &&
    cells.friction.kind === "match" &&
    cells.buoyancy.kind === "match"
  );
}
