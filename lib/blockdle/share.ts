import { ATTEMPTS_MAX, type GuessCellResult, type GuessComparison } from "./types";

function cellGlyph(r: GuessCellResult): string {
  switch (r.kind) {
    case "match":
      return "\u{1F7E9}"; // 🟩
    case "miss":
      return "\u{1F7E5}"; // 🟥
    case "higher":
      return "⬆️"; // ⬆️
    case "lower":
      return "⬇️"; // ⬇️
  }
}

export type ShareGridInput = {
  dateIsoUtc: string;
  guesses: GuessComparison[];
  won: boolean;
  siteUrl?: string;
};

export function buildShareGrid(input: ShareGridInput): string {
  const { dateIsoUtc, guesses, won, siteUrl } = input;
  const header = `Blockdle ${dateIsoUtc} — ${won ? `${guesses.length}/${ATTEMPTS_MAX}` : `X/${ATTEMPTS_MAX}`}`;
  const rows = guesses.map((g) => {
    const c = g.cells;
    return [
      cellGlyph(c.category),
      cellGlyph(c.material),
      cellGlyph(c.durability),
      cellGlyph(c.density),
      cellGlyph(c.friction),
      cellGlyph(c.buoyancy),
    ].join("");
  });
  const lines = [header, "", ...rows];
  if (siteUrl) {
    lines.push("", siteUrl);
  }
  return lines.join("\n");
}
