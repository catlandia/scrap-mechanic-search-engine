import { classify } from "@/lib/tagger/classify";

const samples = [
  {
    label: "Drivable camper (house + car)",
    input: {
      title: "Drivable Camper Van",
      descriptionClean:
        "A fully working camper van with bedroom, kitchen, and off-road suspension. Drives like a real motorhome.",
      steamTags: ["Blueprint", "Vehicle"],
    },
  },
  {
    label: "Spider walker mech",
    input: {
      title: "Hexapod Spider Walker",
      descriptionClean:
        "A six-legged walker mech with controllable gait and cockpit. Hexapod design inspired by sci-fi.",
      steamTags: ["Blueprint", "Walker", "Mech"],
    },
  },
  {
    label: "Fighter jet",
    input: {
      title: "F-15 Fighter Jet",
      descriptionClean:
        "An airplane styled after the F-15 fighter jet. Flies fast, includes working turret.",
      steamTags: ["Blueprint", "Vehicle"],
    },
  },
  {
    label: "Random tile",
    input: {
      title: "Forest Biome Tile",
      descriptionClean: "A custom forest tile with trees, rocks, and a small river.",
      steamTags: ["Tile"],
    },
  },
  {
    label: "Obvious house",
    input: {
      title: "Modern Mansion",
      descriptionClean:
        "Two-story modern mansion with pool, garage, and functional doors.",
      steamTags: ["Blueprint"],
    },
  },
];

for (const s of samples) {
  const suggestions = classify(s.input);
  console.log(`\n== ${s.label} ==`);
  console.log(`title: ${s.input.title}`);
  if (suggestions.length === 0) {
    console.log("  (no suggestions)");
  } else {
    for (const sug of suggestions) {
      console.log(
        `  ${sug.slug.padEnd(16)} score=${sug.score} conf=${sug.confidence.toFixed(2)} src=${sug.source}`,
      );
    }
  }
}
