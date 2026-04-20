import {
  NORMAL_CHARACTERS,
  CHAPTER_2,
  CHAPTER_2_CHANCE,
  type Character,
} from "./config";

// Shared question generator used by both the login gate (app/verify) and the
// minigame (app/minigames/scrapcha). The logic was duplicated across the two;
// keeping it here means new characters or tuning changes land in one place.

export type CaptchaQuestion = {
  id: string;
  image: string;
  correct: string;
  options: string[];
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickImage(images: string[]): string {
  return images[Math.floor(Math.random() * images.length)];
}

function buildQuestion(char: Character, pool: Character[]): CaptchaQuestion {
  const wrongPool = pool.filter((c) => c.id !== char.id).map((c) => c.answer);
  const wrongOptions = shuffle(wrongPool).slice(0, 3);
  const options = shuffle([char.answer, ...wrongOptions]);
  return { id: char.id, image: pickImage(char.images), correct: char.answer, options };
}

export function generateQuestions(count = 3): CaptchaQuestion[] {
  const allChars = [...NORMAL_CHARACTERS, CHAPTER_2];
  const used = new Set<string>();
  const questions: CaptchaQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const useChapter2 = !used.has("chapter2") && Math.random() < CHAPTER_2_CHANCE;
    let char: Character;
    if (useChapter2) {
      char = CHAPTER_2;
    } else {
      const available = NORMAL_CHARACTERS.filter((c) => !used.has(c.id));
      if (available.length === 0) {
        // Pool ran out; reset so longer rounds can keep going without dead end.
        used.clear();
        const reset = NORMAL_CHARACTERS.filter((c) => !used.has(c.id));
        char = reset[Math.floor(Math.random() * reset.length)];
      } else {
        char = available[Math.floor(Math.random() * available.length)];
      }
    }
    used.add(char.id);
    questions.push(buildQuestion(char, allChars));
  }

  return questions;
}
