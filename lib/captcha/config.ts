export type Character = {
  id: string;
  answer: string;
  images: string[];
  rare?: boolean;
};

// ~3.45% per question slot → ~10% chance of seeing Chapter 2 at least once across 3 questions
export const CHAPTER_2_CHANCE = 0.0345;

export const NORMAL_CHARACTERS: Character[] = [
  {
    id: "mechanic",
    answer: "Mechanic",
    images: ["/captcha/Mechanic1.jpg", "/captcha/Mechanic2.jpg", "/captcha/Mechanic3.jpg"],
  },
  {
    id: "totebot",
    answer: "Totebot",
    images: ["/captcha/Totebot1.jpg", "/captcha/Totebot2.jpg", "/captcha/Totebot3.jpg"],
  },
  {
    id: "haybot",
    answer: "Haybot",
    images: ["/captcha/Haybot1.jpg", "/captcha/Haybot2.jpg", "/captcha/Haybot3.jpg"],
  },
  {
    id: "tapebot",
    answer: "Tapebot",
    images: ["/captcha/Tapebot1.jpg", "/captcha/Tapebot2.jpg", "/captcha/Tapebot3.jpg"],
  },
  {
    id: "farmbot",
    answer: "Farmbot",
    images: ["/captcha/Farmbot1.jpg", "/captcha/Farmbot2.jpg", "/captcha/Farmbot3.jpg"],
  },
  {
    id: "glowb",
    answer: "Glowb",
    images: ["/captcha/Glowb1.jpg", "/captcha/Glowb2.jpg", "/captcha/Glowb3.jpg"],
  },
  {
    id: "woc",
    answer: "Woc",
    images: ["/captcha/Woc1.jpg", "/captcha/Woc2.jpg", "/captcha/Woc3.jpg"],
  },
  {
    id: "redtapebot",
    answer: "Redtapebot",
    images: ["/captcha/Redtapebot1.jpg", "/captcha/Redtapebot2.jpg", "/captcha/Redtapebot3.jpg"],
  },
];

export const CHAPTER_2: Character = {
  id: "chapter2",
  answer: "tomorrow",
  images: ["/captcha/Chapter2.jpg"],
  rare: true,
};

export const ALL_CHARACTERS = [...NORMAL_CHARACTERS, CHAPTER_2];
