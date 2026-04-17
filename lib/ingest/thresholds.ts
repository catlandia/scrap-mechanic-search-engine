export interface KindThresholds {
  minSubscriptions: number;
  minAgeDays: number;
}

export const DEFAULT_THRESHOLDS: KindThresholds = {
  minSubscriptions: 500,
  minAgeDays: 7,
};

export const KIND_THRESHOLDS: Record<string, KindThresholds> = {
  blueprint: { minSubscriptions: 500, minAgeDays: 7 },
  mod: { minSubscriptions: 100, minAgeDays: 3 },
  world: { minSubscriptions: 150, minAgeDays: 5 },
  challenge: { minSubscriptions: 100, minAgeDays: 3 },
  tile: { minSubscriptions: 75, minAgeDays: 3 },
  custom_game: { minSubscriptions: 100, minAgeDays: 3 },
  terrain_asset: { minSubscriptions: 50, minAgeDays: 3 },
  other: DEFAULT_THRESHOLDS,
};

export function thresholdsForKind(kind: string): KindThresholds {
  return KIND_THRESHOLDS[kind] ?? DEFAULT_THRESHOLDS;
}
