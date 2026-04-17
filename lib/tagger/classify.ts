import { TAG_KEYWORDS } from "./keywords";

export interface TagSuggestion {
  slug: string;
  confidence: number;
  source: "keyword" | "steam";
  score: number;
}

export interface ClassifyInput {
  title: string;
  descriptionClean: string;
  steamTags: string[];
}

const TITLE_WEIGHT = 3;
const STEAM_TAG_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;
const SCORE_THRESHOLD = 2;
const CONFIDENCE_SCALE = 6;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(pattern: RegExp, text: string): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function buildPattern(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, "gi");
}

export function classify(input: ClassifyInput): TagSuggestion[] {
  const title = input.title.toLowerCase();
  const description = input.descriptionClean.toLowerCase();
  const steamTagsLower = new Set(input.steamTags.map((t) => t.toLowerCase().trim()));

  const suggestions: TagSuggestion[] = [];

  for (const { slug, keywords } of TAG_KEYWORDS) {
    let score = 0;
    let steamHit = false;

    const slugAsPhrase = slug.replace(/-/g, " ").toLowerCase();
    if (steamTagsLower.has(slugAsPhrase)) {
      score += STEAM_TAG_WEIGHT;
      steamHit = true;
    }
    for (const kw of keywords) {
      const lower = kw.toLowerCase();
      if (steamTagsLower.has(lower)) {
        score += STEAM_TAG_WEIGHT;
        steamHit = true;
      }
    }

    for (const kw of keywords) {
      const pattern = buildPattern(kw);
      score += countMatches(pattern, title) * TITLE_WEIGHT;
      score += countMatches(pattern, description) * DESCRIPTION_WEIGHT;
    }

    if (score < SCORE_THRESHOLD) continue;

    suggestions.push({
      slug,
      confidence: Math.min(1, score / CONFIDENCE_SCALE),
      source: steamHit ? "steam" : "keyword",
      score,
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions;
}
