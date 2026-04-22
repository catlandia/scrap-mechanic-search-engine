"use client";

import Image from "next/image";
import type { GuessCellResult, GuessComparison } from "@/lib/blockdle/types";

// Color-coded cell for a single attribute in a guess row. The arrow column
// is inline-after so a "higher"/"lower" miss reads like "4 ↑".
function cellClass(kind: GuessCellResult["kind"]): string {
  switch (kind) {
    case "match":
      return "bg-emerald-500/25 text-emerald-100 border-emerald-500/50";
    case "miss":
      return "bg-red-500/20 text-red-100 border-red-500/40";
    case "higher":
    case "lower":
      return "bg-amber-500/20 text-amber-100 border-amber-500/40";
  }
}

function arrowGlyph(kind: GuessCellResult["kind"]): string {
  if (kind === "higher") return " ↑";
  if (kind === "lower") return " ↓";
  return "";
}

type Props = {
  guess: GuessComparison;
};

export function GuessRow({ guess }: Props) {
  const { cells } = guess;
  const base = "flex items-center justify-center rounded border px-1 py-1 text-[11px] font-medium text-center min-h-9 sm:text-xs";
  return (
    <div className="grid grid-cols-[56px_1.6fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-1.5 sm:gap-2">
      <div className="flex h-14 items-center justify-center overflow-hidden rounded border border-border bg-black/40">
        <Image
          src={`/api/minigames/blockdle/icon/${guess.guessUuid}`}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 object-contain"
        />
      </div>
      <div className={`${base} bg-foreground/5 text-foreground/85 border-border`}>
        {guess.guessName}
      </div>
      <div className={`${base} ${cellClass(cells.category.kind)}`}>
        {guess.guessCategory}
      </div>
      <div className={`${base} ${cellClass(cells.material.kind)}`}>
        {guess.guessMaterial}
      </div>
      <div className={`${base} tabular-nums ${cellClass(cells.durability.kind)}`}>
        {guess.guessDurability}
        {arrowGlyph(cells.durability.kind)}
      </div>
      <div className={`${base} tabular-nums ${cellClass(cells.density.kind)}`}>
        {guess.guessDensity}
        {arrowGlyph(cells.density.kind)}
      </div>
      <div className={`${base} tabular-nums ${cellClass(cells.friction.kind)}`}>
        {guess.guessFriction}
        {arrowGlyph(cells.friction.kind)}
      </div>
      <div className={`${base} tabular-nums ${cellClass(cells.buoyancy.kind)}`}>
        {guess.guessBuoyancy}
        {arrowGlyph(cells.buoyancy.kind)}
      </div>
    </div>
  );
}

export function GuessRowHeader({
  labels,
}: {
  labels: {
    icon: string;
    name: string;
    category: string;
    material: string;
    durability: string;
    density: string;
    friction: string;
    buoyancy: string;
  };
}) {
  const cls = "text-[10px] uppercase tracking-wider text-foreground/40 text-center";
  return (
    <div className="grid grid-cols-[56px_1.6fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-1.5 sm:gap-2">
      <div className={cls}>{labels.icon}</div>
      <div className={cls}>{labels.name}</div>
      <div className={cls}>{labels.category}</div>
      <div className={cls}>{labels.material}</div>
      <div className={cls}>{labels.durability}</div>
      <div className={cls}>{labels.density}</div>
      <div className={cls}>{labels.friction}</div>
      <div className={cls}>{labels.buoyancy}</div>
    </div>
  );
}

export function EmptyGuessRow() {
  return (
    <div className="grid grid-cols-[56px_1.6fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-1.5 sm:gap-2">
      <div className="h-14 rounded border border-dashed border-border/40 bg-foreground/[0.02]" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
      <div className="h-9 rounded border border-dashed border-border/40" />
    </div>
  );
}
