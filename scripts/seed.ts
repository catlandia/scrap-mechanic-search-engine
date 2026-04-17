import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { getDb } from "@/lib/db/client";
import { categories, tags } from "@/lib/db/schema";

const CATEGORIES = [
  { slug: "vehicle", name: "Vehicle", description: "Anything that moves under its own power." },
  { slug: "building", name: "Building", description: "Houses, castles, bases, and other static structures." },
  { slug: "mechanism", name: "Mechanism", description: "Machines, contraptions, and moving systems." },
  { slug: "weapon", name: "Weapon", description: "Cannons, guns, launchers, and explosive devices." },
  { slug: "decoration", name: "Decoration", description: "Art, sculptures, and aesthetic builds." },
  { slug: "logic", name: "Logic", description: "Computers, clocks, counters, and other logic-gate builds." },
  { slug: "tool", name: "Tool", description: "Utility builds that do a specific job." },
] as const;

const TAGS: Array<{ slug: string; name: string; category: typeof CATEGORIES[number]["slug"] }> = [
  { slug: "car", name: "Car", category: "vehicle" },
  { slug: "truck", name: "Truck", category: "vehicle" },
  { slug: "motorcycle", name: "Motorcycle", category: "vehicle" },
  { slug: "plane", name: "Plane", category: "vehicle" },
  { slug: "helicopter", name: "Helicopter", category: "vehicle" },
  { slug: "boat", name: "Boat", category: "vehicle" },
  { slug: "submarine", name: "Submarine", category: "vehicle" },
  { slug: "tank", name: "Tank", category: "vehicle" },
  { slug: "walker", name: "Walker", category: "vehicle" },
  { slug: "mech", name: "Mech", category: "vehicle" },
  { slug: "train", name: "Train", category: "vehicle" },
  { slug: "spacecraft", name: "Spacecraft", category: "vehicle" },

  { slug: "house", name: "House", category: "building" },
  { slug: "castle", name: "Castle", category: "building" },
  { slug: "base", name: "Base", category: "building" },
  { slug: "shop", name: "Shop", category: "building" },
  { slug: "farm", name: "Farm", category: "building" },
  { slug: "bridge", name: "Bridge", category: "building" },
  { slug: "tower", name: "Tower", category: "building" },

  { slug: "elevator", name: "Elevator", category: "mechanism" },
  { slug: "crane", name: "Crane", category: "mechanism" },
  { slug: "door-system", name: "Door System", category: "mechanism" },
  { slug: "suspension", name: "Suspension", category: "mechanism" },
  { slug: "transmission", name: "Transmission", category: "mechanism" },
  { slug: "turret", name: "Turret", category: "mechanism" },

  { slug: "cannon", name: "Cannon", category: "weapon" },
  { slug: "gun", name: "Gun", category: "weapon" },
  { slug: "missile-launcher", name: "Missile Launcher", category: "weapon" },
  { slug: "explosive", name: "Explosive", category: "weapon" },
  { slug: "trap", name: "Trap", category: "weapon" },

  { slug: "statue", name: "Statue", category: "decoration" },
  { slug: "pixel-art", name: "Pixel Art", category: "decoration" },
  { slug: "sculpture", name: "Sculpture", category: "decoration" },

  { slug: "computer", name: "Computer", category: "logic" },
  { slug: "clock", name: "Clock", category: "logic" },
  { slug: "calculator", name: "Calculator", category: "logic" },

  { slug: "printer", name: "Printer", category: "tool" },
  { slug: "transport-tool", name: "Transport Tool", category: "tool" },
];

async function main() {
  const db = getDb();

  console.log(`Seeding ${CATEGORIES.length} categories…`);
  for (const c of CATEGORIES) {
    await db
      .insert(categories)
      .values({ slug: c.slug, name: c.name, description: c.description })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: c.name, description: c.description },
      });
  }

  const catRows = await db.select().from(categories);
  const catIdFor = (slug: string) => {
    const row = catRows.find((r) => r.slug === slug);
    if (!row) throw new Error(`category ${slug} missing`);
    return row.id;
  };

  console.log(`Seeding ${TAGS.length} tags…`);
  for (const t of TAGS) {
    await db
      .insert(tags)
      .values({ slug: t.slug, name: t.name, categoryId: catIdFor(t.category) })
      .onConflictDoUpdate({
        target: tags.slug,
        set: { name: t.name, categoryId: catIdFor(t.category) },
      });
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
