/**
 * Keyword aliases per canonical tag slug. Slugs must exist in the `tags` table
 * (seeded by scripts/seed.ts).
 *
 * Each string is matched case-insensitively against title + cleaned description
 * with word-boundary semantics. Multi-word entries match as a phrase.
 */
export interface TagKeywordSpec {
  slug: string;
  keywords: string[];
}

export const TAG_KEYWORDS: TagKeywordSpec[] = [
  // --- Vehicles ---
  { slug: "car", keywords: ["car", "cars", "automobile", "sedan", "coupe", "hatchback", "sports car", "van"] },
  { slug: "truck", keywords: ["truck", "lorry", "pickup", "semi truck", "semi-truck", "18 wheeler"] },
  { slug: "motorcycle", keywords: ["motorcycle", "motorbike", "motor bike", "scooter", "moped"] },
  { slug: "plane", keywords: ["plane", "planes", "airplane", "aircraft", "jet", "biplane", "fighter jet", "airliner"] },
  { slug: "helicopter", keywords: ["helicopter", "chopper", "heli"] },
  { slug: "boat", keywords: ["boat", "boats", "ship", "yacht", "sailboat", "vessel", "trawler"] },
  { slug: "submarine", keywords: ["submarine", "u-boat"] },
  { slug: "tank", keywords: ["tank", "battle tank", "armored vehicle", "armoured vehicle"] },
  { slug: "walker", keywords: ["walker", "walkers", "hexapod", "quadruped", "spider bot"] },
  { slug: "mech", keywords: ["mech", "mecha", "robot", "exosuit", "mechsuit"] },
  { slug: "train", keywords: ["train", "locomotive", "railway", "rail car", "railcar"] },
  { slug: "spacecraft", keywords: ["spaceship", "spacecraft", "rocket", "ufo", "satellite", "space ship"] },

  // --- Buildings ---
  { slug: "house", keywords: ["house", "home", "cabin", "cottage", "mansion", "villa", "bungalow", "camper"] },
  { slug: "castle", keywords: ["castle", "fortress", "keep", "citadel", "stronghold", "fort"] },
  { slug: "base", keywords: ["base", "hq", "headquarters", "outpost", "compound", "bunker"] },
  { slug: "shop", keywords: ["shop", "store", "market", "mall"] },
  { slug: "farm", keywords: ["farm", "plantation", "greenhouse", "barn"] },
  { slug: "bridge", keywords: ["bridge"] },
  { slug: "tower", keywords: ["tower", "watchtower", "skyscraper"] },

  // --- Mechanisms ---
  { slug: "elevator", keywords: ["elevator", "lift"] },
  { slug: "crane", keywords: ["crane"] },
  { slug: "door-system", keywords: ["door", "doors", "gate", "portal", "hatch", "airlock"] },
  { slug: "suspension", keywords: ["suspension", "shock absorber", "shocks"] },
  { slug: "transmission", keywords: ["transmission", "gearbox", "gear box", "gear ratio"] },
  { slug: "turret", keywords: ["turret", "turrets"] },

  // --- Weapons ---
  { slug: "cannon", keywords: ["cannon", "artillery"] },
  { slug: "gun", keywords: ["gun", "pistol", "rifle", "shotgun", "machine gun", "minigun"] },
  { slug: "missile-launcher", keywords: ["missile", "rocket launcher", "launcher", "torpedo"] },
  { slug: "explosive", keywords: ["bomb", "bombs", "explosive", "tnt", "dynamite", "c4", "mine"] },
  { slug: "trap", keywords: ["trap", "snare"] },

  // --- Decoration ---
  { slug: "statue", keywords: ["statue", "monument"] },
  { slug: "pixel-art", keywords: ["pixel art", "pixel-art", "mosaic"] },
  { slug: "sculpture", keywords: ["sculpture"] },

  // --- Logic ---
  { slug: "computer", keywords: ["computer", "cpu", "processor"] },
  { slug: "clock", keywords: ["clock", "timer"] },
  { slug: "calculator", keywords: ["calculator", "adder", "alu", "arithmetic logic unit"] },

  // --- Tools ---
  { slug: "printer", keywords: ["printer", "3d printer", "3d-printer"] },
  { slug: "transport-tool", keywords: ["conveyor", "trolley", "forklift", "transport"] },
];

export function findKeywordSpec(slug: string): TagKeywordSpec | undefined {
  return TAG_KEYWORDS.find((t) => t.slug === slug);
}
