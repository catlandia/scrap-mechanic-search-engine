import type { Block, GuessCellResult, GuessComparison } from "./types";

function textCell<T extends string>(guess: T, answer: T): GuessCellResult {
  return guess === answer ? { kind: "match" } : { kind: "miss" };
}

function numCell(guess: number, answer: number): GuessCellResult {
  if (guess === answer) return { kind: "match" };
  return answer > guess ? { kind: "higher" } : { kind: "lower" };
}

export function compareGuess(guess: Block, answer: Block): GuessComparison {
  return {
    guessUuid: guess.uuid,
    guessName: guess.title,
    guessCategory: guess.category,
    guessMaterial: guess.material,
    guessDurability: guess.durability,
    guessDensity: guess.density,
    guessFriction: guess.friction,
    guessBuoyancy: guess.buoyancy,
    cells: {
      category: textCell(guess.category, answer.category),
      material: textCell(guess.material, answer.material),
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
    cells.category.kind === "match" &&
    cells.material.kind === "match" &&
    cells.durability.kind === "match" &&
    cells.density.kind === "match" &&
    cells.friction.kind === "match" &&
    cells.buoyancy.kind === "match"
  );
}
