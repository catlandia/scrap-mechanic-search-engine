export type Character = {
  id: string;
  answer: string;
  images: string[];
  rare?: boolean;
};

// ~3.45% per question slot → ~10% chance of seeing Chapter 2 at least once across 3 questions
export const CHAPTER_2_CHANCE = 0.0345;

// Image filenames are opaque numeric ids (01.jpg … 25.jpg) stored outside
// `public/` at `lib/captcha/images/`. The mapping from character → file lives
// only server-side; the browser sees an `/api/captcha/image?n=<nonce>` proxy
// URL, never a filename.
export const NORMAL_CHARACTERS: Character[] = [
  { id: "mechanic",   answer: "Mechanic",   images: ["01.jpg", "02.jpg", "03.jpg"] },
  { id: "totebot",    answer: "Totebot",    images: ["04.jpg", "05.jpg", "06.jpg"] },
  { id: "haybot",     answer: "Haybot",     images: ["07.jpg", "08.jpg", "09.jpg"] },
  { id: "tapebot",    answer: "Tapebot",    images: ["10.jpg", "11.jpg", "12.jpg"] },
  { id: "farmbot",    answer: "Farmbot",    images: ["13.jpg", "14.jpg", "15.jpg"] },
  { id: "glowb",      answer: "Glowb",      images: ["16.jpg", "17.jpg", "18.jpg"] },
  { id: "woc",        answer: "Woc",        images: ["19.jpg", "20.jpg", "21.jpg"] },
  { id: "redtapebot", answer: "Redtapebot", images: ["22.jpg", "23.jpg", "24.jpg"] },
];

export const CHAPTER_2: Character = {
  id: "chapter2",
  answer: "tomorrow",
  images: ["25.jpg"],
  rare: true,
};

export const ALL_CHARACTERS = [...NORMAL_CHARACTERS, CHAPTER_2];
