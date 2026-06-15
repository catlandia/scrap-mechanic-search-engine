// Scrap Mechanic Clicker — pure client-side idle game.
//
// No database, no server actions, no leaderboard: every byte of state lives in
// localStorage on the player's machine. That keeps the game off the free-tier
// CPU + Neon meters entirely (see CLAUDE.md "Free tier is a hard rule").
//
// This module holds the static catalogue (generators + upgrades) and the pure
// math (cost curves, sps, number formatting). ClickerGame.tsx owns the React
// state and side effects.

export const SAVE_KEY = "smse_clicker_v1";

// Real Scrap Mechanic item icons. The UUIDs below index into the icon set that
// Blockdle already extracts from the game install (gitignored, fetched at build
// from the private blockdle-data repo) and serves at the route below — so we get
// genuine in-game art without committing Facepunch's assets to this public repo.
// `emoji` is a graceful fallback for when the manifest isn't present (e.g. a
// build with Blockdle unconfigured): <Icon> swaps to it if the PNG 404s.
export function iconUrl(uuid: string): string {
  return `/api/minigames/blockdle/icon/${uuid}`;
}

/** The part the player taps to harvest scrap by hand. */
export const CLICKER_ICON = { uuid: "4a1b886b-913e-4aad-b5b6-6e41b0db23a6", emoji: "⚙️", label: "Bearing" };

/** A passive scrap producer the player buys repeatedly. Cost climbs 15% per unit owned. */
export type Generator = {
  id: string;
  /** Real Scrap Mechanic item name. */
  name: string;
  /** UUID into the shared SM icon set (see iconUrl). */
  iconUuid: string;
  /** Emoji fallback if the icon PNG isn't available. */
  emoji: string;
  /** Cost of the FIRST unit, in scrap. */
  baseCost: number;
  /** Scrap-per-second produced by ONE unit, before upgrade multipliers. */
  baseSps: number;
  blurb: string;
};

// Classic idle-game progression: each tier costs ~10x the last and produces
// proportionally more. Every entry is a real in-game part, ordered to read as an
// escalating salvage operation.
export const GENERATORS: Generator[] = [
  { id: "sensor", name: "Sensor", iconUuid: "1d4793af-cb66-4628-804a-9d7404712643", emoji: "📡", baseCost: 15, baseSps: 0.1, blurb: "Sniffs out the good scrap buried in a pile of junk." },
  { id: "battery", name: "Battery", iconUuid: "910a7f2c-52b0-46eb-8873-ad13255539af", emoji: "🔋", baseCost: 100, baseSps: 1, blurb: "Stores enough juice to keep a little rig harvesting." },
  { id: "vacuum", name: "Vacuum Pump", iconUuid: "97f449b6-c948-448b-b8b3-4448e3f6b956", emoji: "🌀", baseCost: 1_100, baseSps: 8, blurb: "Hoovers up loose scrap before it rolls away." },
  { id: "piston", name: "Piston", iconUuid: "8c741785-5eae-4c48-9f99-d62bf522a83f", emoji: "🔧", baseCost: 12_000, baseSps: 47, blurb: "Crushes wrecks down into tidy scrap cubes." },
  { id: "gasengine", name: "Gas Engine", iconUuid: "1bfccc0a-828f-475c-882c-87d5a96054c9", emoji: "🛢️", baseCost: 130_000, baseSps: 260, blurb: "Powers a proper salvage rig around the clock." },
  { id: "totebot", name: "Totebot Head", iconUuid: "a052e116-f273-4d73-872c-924a97b86720", emoji: "🤖", baseCost: 1_400_000, baseSps: 1_400, blurb: "A reprogrammed totebot that hauls scrap all day." },
  { id: "thruster", name: "Thruster", iconUuid: "df8528ed-15ad-4a39-a33a-698880684001", emoji: "🔥", baseCost: 20_000_000, baseSps: 7_800, blurb: "Rips bigger wrecks loose so they can be salvaged." },
  { id: "cookbot", name: "Cookbot", iconUuid: "2af00456-b22e-4743-b338-a91934aba7c5", emoji: "🍳", baseCost: 330_000_000, baseSps: 44_000, blurb: "Somehow turns scrap into more scrap. Do not ask." },
  { id: "craftbot", name: "Craftbot", iconUuid: "b63c6440-dfc2-4da7-acdb-3c385080b2e4", emoji: "🛠️", baseCost: 5_100_000_000, baseSps: 260_000, blurb: "Crafts scrap out of, somehow, even more scrap." },
  { id: "spaceship", name: "Salvage Ship", iconUuid: "027bd4ec-b16d-47d2-8756-e18dc2af3eb6", emoji: "🚀", baseCost: 75_000_000_000, baseSps: 1_600_000, blurb: "Drags entire orbital wrecks back down to the yard." },
];

/** A one-time purchase that permanently boosts output. */
export type Upgrade = {
  id: string;
  name: string;
  iconUuid: string;
  emoji: string;
  cost: number;
  desc: string;
  /** Multiplier applied to its target's output. */
  multiplier: number;
} & (
  | { kind: "generator"; target: string; requireOwned: number }
  | { kind: "click"; requireClicks: number }
);

// Per-generator upgrades: each unlocks once you own enough of that generator,
// then doubles its output. Three tiers per generator gives a steady drip of
// affordable goals that follow whatever the player is currently buying.
const GEN_UPGRADE_TIERS = [
  { owned: 10, costMult: 12, label: "Tuned" },
  { owned: 50, costMult: 90, label: "Overclocked" },
  { owned: 100, costMult: 700, label: "Singularity-grade" },
];

function buildGeneratorUpgrades(): Upgrade[] {
  const out: Upgrade[] = [];
  for (const g of GENERATORS) {
    for (const tier of GEN_UPGRADE_TIERS) {
      out.push({
        id: `${g.id}-${tier.owned}`,
        kind: "generator",
        target: g.id,
        requireOwned: tier.owned,
        name: `${tier.label} ${g.name}`,
        iconUuid: g.iconUuid,
        emoji: g.emoji,
        cost: Math.round(g.baseCost * tier.costMult),
        desc: `${g.name}s produce twice as much scrap. (Own ${tier.owned}.)`,
        multiplier: 2,
      });
    }
  }
  return out;
}

// Click upgrades: each doubles the per-click base, unlocked by total clicks so
// active players who keep tapping are rewarded for it.
const CLICK_UPGRADES: Upgrade[] = [
  { id: "click-1", kind: "click", requireClicks: 50, name: "Work Gloves", iconUuid: CLICKER_ICON.uuid, emoji: "🧤", cost: 500, desc: "Double scrap per click.", multiplier: 2 },
  { id: "click-2", kind: "click", requireClicks: 250, name: "Power Glove", iconUuid: CLICKER_ICON.uuid, emoji: "💪", cost: 12_000, desc: "Double scrap per click again.", multiplier: 2 },
  { id: "click-3", kind: "click", requireClicks: 1_000, name: "Magnet Hand", iconUuid: CLICKER_ICON.uuid, emoji: "🧲", cost: 350_000, desc: "Double scrap per click again.", multiplier: 2 },
  { id: "click-4", kind: "click", requireClicks: 5_000, name: "Hydraulic Fist", iconUuid: CLICKER_ICON.uuid, emoji: "🦾", cost: 9_000_000, desc: "Double scrap per click again.", multiplier: 2 },
  { id: "click-5", kind: "click", requireClicks: 20_000, name: "Gravity Gauntlet", iconUuid: CLICKER_ICON.uuid, emoji: "🌌", cost: 250_000_000, desc: "Double scrap per click again.", multiplier: 2 },
];

export const UPGRADES: Upgrade[] = [...buildGeneratorUpgrades(), ...CLICK_UPGRADES];
export const UPGRADES_BY_ID: Record<string, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

/** Fraction of total sps that each manual click is worth, so clicking stays useful late-game. */
export const CLICK_SPS_FRACTION = 0.02;
/** Offline progress pays out at half rate, capped to this many hours. */
export const OFFLINE_CAP_HOURS = 3;
export const OFFLINE_RATE = 0.5;

export type SaveState = {
  scrap: number;
  totalEarned: number;
  clicks: number;
  /** generator id -> count owned */
  owned: Record<string, number>;
  /** purchased upgrade ids */
  upgrades: string[];
  /** ms timestamp of last save, for offline-earnings calc */
  lastSeen: number;
};

export function freshSave(now: number): SaveState {
  return { scrap: 0, totalEarned: 0, clicks: 0, owned: {}, upgrades: [], lastSeen: now };
}

const COST_GROWTH = 1.15;

/** Cost of the next single unit of a generator given how many are already owned. */
export function unitCost(g: Generator, owned: number): number {
  return Math.ceil(g.baseCost * Math.pow(COST_GROWTH, owned));
}

/** Total cost of buying `count` more units of a generator (geometric series). */
export function bulkCost(g: Generator, owned: number, count: number): number {
  // base * r^owned * (r^count - 1) / (r - 1)
  const first = g.baseCost * Math.pow(COST_GROWTH, owned);
  return Math.ceil((first * (Math.pow(COST_GROWTH, count) - 1)) / (COST_GROWTH - 1));
}

/** Largest number of units of a generator affordable with `scrap`. */
export function maxAffordable(g: Generator, owned: number, scrap: number): number {
  // Solve bulkCost <= scrap for count via the closed form, then verify.
  const first = g.baseCost * Math.pow(COST_GROWTH, owned);
  const ratio = (scrap * (COST_GROWTH - 1)) / first + 1;
  if (ratio <= 1) return 0;
  let n = Math.floor(Math.log(ratio) / Math.log(COST_GROWTH));
  // Guard against floating-point overshoot.
  while (n > 0 && bulkCost(g, owned, n) > scrap) n--;
  return n;
}

/** Effective sps for one unit of a generator, after its purchased upgrades. */
export function generatorMultiplier(genId: string, upgrades: Set<string>): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (u.kind === "generator" && u.target === genId && upgrades.has(u.id)) {
      m *= u.multiplier;
    }
  }
  return m;
}

/** Total scrap-per-second across all owned generators. */
export function totalSps(owned: Record<string, number>, upgrades: Set<string>): number {
  let sps = 0;
  for (const g of GENERATORS) {
    const n = owned[g.id] ?? 0;
    if (n > 0) sps += n * g.baseSps * generatorMultiplier(g.id, upgrades);
  }
  return sps;
}

/** Scrap earned per manual click. */
export function perClick(sps: number, upgrades: Set<string>): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.kind === "click" && upgrades.has(u.id)) mult *= u.multiplier;
  }
  return mult + Math.floor(sps * CLICK_SPS_FRACTION);
}

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** Compact scrap formatting: 1234 -> "1.23K", 5e9 -> "5.00B". */
export function formatScrap(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
}

/** Per-second rate formatting — keeps a couple of decimals for slow early rates. */
export function formatRate(n: number): string {
  if (n > 0 && n < 10) return n.toFixed(1);
  return formatScrap(n);
}

/** Validate + normalise a parsed save blob from localStorage. Returns null if unusable. */
export function coerceSave(raw: unknown, now: number): SaveState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const owned: Record<string, number> = {};
  if (r.owned && typeof r.owned === "object") {
    for (const g of GENERATORS) {
      const v = (r.owned as Record<string, unknown>)[g.id];
      if (typeof v === "number" && v >= 0 && isFinite(v)) owned[g.id] = Math.floor(v);
    }
  }
  const upgrades = Array.isArray(r.upgrades)
    ? (r.upgrades.filter((id) => typeof id === "string" && id in UPGRADES_BY_ID) as string[])
    : [];
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
  return {
    scrap: num(r.scrap),
    totalEarned: num(r.totalEarned),
    clicks: num(r.clicks),
    owned,
    upgrades,
    lastSeen: typeof r.lastSeen === "number" && r.lastSeen > 0 ? r.lastSeen : now,
  };
}
