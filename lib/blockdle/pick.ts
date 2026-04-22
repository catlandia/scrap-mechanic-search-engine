import type { Block } from "./types";

// FNV-1a 32-bit. No deps, deterministic, plenty of spread for per-day seeds.
// Salt is appended in `pickDailyBlock` so bumping it re-rolls every past and
// future day without touching any stored state.
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const DAILY_SALT = "blockdle-v1";

export function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function pickDailyBlock(dateIsoUtc: string, blocks: readonly Block[]): Block {
  if (blocks.length === 0) throw new Error("no blocks");
  const h = hashString(dateIsoUtc + "|" + DAILY_SALT);
  return blocks[h % blocks.length];
}

export function pickRandomBlock(
  blocks: readonly Block[],
  excludeUuid?: string,
): Block {
  if (blocks.length === 0) throw new Error("no blocks");
  const pool = excludeUuid ? blocks.filter((b) => b.uuid !== excludeUuid) : blocks;
  // If excluding the single remaining block would leave us nothing, fall
  // back to the original pool — the player gets the same answer twice, but
  // the game doesn't crash.
  const source = pool.length > 0 ? pool : blocks;
  return source[Math.floor(Math.random() * source.length)];
}
