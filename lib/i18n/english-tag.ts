// Tag *display names* are locked to a subset of printable ASCII so the
// catalogue reads consistently regardless of which UI language the viewer has
// picked. Slugs are already ASCII-only via the regex in createTag/updateTag;
// this covers the human-readable name too. Allowed: letters, digits, spaces,
// hyphens, apostrophes, ampersands, parentheses, slashes, commas, periods,
// plus signs. Anything else — including Cyrillic, CJK, umlauted letters,
// accented Latin — is rejected.
const ALLOWED_NAME = /^[A-Za-z0-9 '\-&()\/,.+]+$/;

export function isEnglishTagName(name: string): boolean {
  return ALLOWED_NAME.test(name);
}

export const ENGLISH_TAG_ERROR =
  "Tag names must be in English (A–Z, 0–9, spaces, and basic punctuation). Unicode letters, accents, and non-Latin scripts are rejected to keep the catalogue consistent.";
