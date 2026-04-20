import type { Locale } from "@/lib/prefs";

// Single flat dictionary per locale. Keys are dot-notation strings. Values may
// contain `{name}` placeholders that `t()` substitutes at call time.
//
// Quality note: these translations are a first-pass AI-assisted seed. They're
// good enough for UI labels but native speakers should polish them — especially
// the RU/DE/PL tone. Long-form copy (terms, privacy, guide, about, admin) is
// deliberately NOT translated here and remains English: machine-translating
// legal/moderation copy risks real harm.
export type Dictionary = Record<string, string>;

const en: Dictionary = {
  "nav.newest": "Newest",
  "nav.browse": "Browse",
  "nav.search": "Search",
  "nav.creators": "Creators",
  "nav.ideas": "Ideas",
  "nav.whatsNew": "What's new",
  "nav.submit": "Submit",
  "nav.signIn": "Sign in with Steam",

  "kind.blueprints": "Blueprints",
  "kind.mods": "Mods",
  "kind.worlds": "Worlds",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Terrain",
  "kind.other": "Other",

  "home.heroTitle": "Find the good stuff from the Workshop.",

  "suggestions.title": "Ideas board",
  "suggestions.eyebrow": "Feature suggestions",
  "suggestions.subtitle":
    "Ideas the Creator has reviewed. Upvote the ones you want first. Rejected ideas stay visible so you can see what didn't make the cut and why.",
  "suggestions.submitCta": "Submit a suggestion",
  "suggestions.tab.approved": "Approved",
  "suggestions.tab.implemented": "Implemented",
  "suggestions.tab.rejected": "Rejected",
  "suggestions.empty.approved": "No approved ideas on the board yet — submit one.",
  "suggestions.empty.implemented":
    "No implemented ideas yet. Things approved and shipped show up here.",
  "suggestions.empty.rejected": "No rejected ideas yet.",

  "submit.title": "Submit a Workshop item",
  "submit.tagsEnglishDisclaimer":
    "Note: tags on the site are English-only, for consistency across the catalogue. Your submission itself can be in any language — just the tag labels stay English.",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint":
    "Switches UI labels. Creations and tags keep their original language — those are authored by other users.",
  "settings.tagsDisclaimer":
    "Tags across the site are always in English. Creations (titles, descriptions) keep whatever language their author wrote.",

  "locale.picker.label": "Language",
};

const ru: Dictionary = {
  "nav.newest": "Новое",
  "nav.browse": "Обзор",
  "nav.search": "Поиск",
  "nav.creators": "Авторы",
  "nav.ideas": "Идеи",
  "nav.whatsNew": "Обновления",
  "nav.submit": "Добавить",
  "nav.signIn": "Войти через Steam",

  "kind.blueprints": "Чертежи",
  "kind.mods": "Моды",
  "kind.worlds": "Миры",
  "kind.challenges": "Задания",
  "kind.tiles": "Тайлы",
  "kind.customGames": "Кастомные игры",
  "kind.terrain": "Рельеф",
  "kind.other": "Прочее",

  "home.heroTitle": "Найдите лучшее из Мастерской.",

  "suggestions.title": "Доска идей",
  "suggestions.eyebrow": "Предложения по функциям",
  "suggestions.subtitle":
    "Идеи, которые рассмотрел автор сайта. Голосуйте за те, что хотите увидеть первыми. Отклонённые идеи остаются видимыми — можно узнать, что и почему не прошло.",
  "suggestions.submitCta": "Предложить идею",
  "suggestions.tab.approved": "Одобрено",
  "suggestions.tab.implemented": "Реализовано",
  "suggestions.tab.rejected": "Отклонено",
  "suggestions.empty.approved": "На доске пока нет одобренных идей — предложите первую.",
  "suggestions.empty.implemented":
    "Реализованных идей пока нет. Сюда попадают те, что одобрили и уже выпустили.",
  "suggestions.empty.rejected": "Отклонённых идей пока нет.",

  "submit.title": "Добавить предмет из Мастерской",
  "submit.tagsEnglishDisclaimer":
    "Обратите внимание: теги на сайте только на английском — ради единообразия каталога. Сама заявка может быть на любом языке, только ярлыки тегов остаются английскими.",

  "settings.title": "Настройки",
  "settings.language": "Язык",
  "settings.languageHint":
    "Переключает подписи интерфейса. Объекты и теги сохраняют свой язык — их пишут другие пользователи.",
  "settings.tagsDisclaimer":
    "Теги на сайте всегда на английском. Объекты (названия, описания) остаются на том языке, на котором их написал автор.",

  "locale.picker.label": "Язык",
};

const de: Dictionary = {
  "nav.newest": "Neueste",
  "nav.browse": "Stöbern",
  "nav.search": "Suche",
  "nav.creators": "Ersteller",
  "nav.ideas": "Ideen",
  "nav.whatsNew": "Neuigkeiten",
  "nav.submit": "Einreichen",
  "nav.signIn": "Mit Steam anmelden",

  "kind.blueprints": "Blaupausen",
  "kind.mods": "Mods",
  "kind.worlds": "Welten",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Gelände",
  "kind.other": "Sonstiges",

  "home.heroTitle": "Finde das Gute aus dem Workshop.",

  "suggestions.title": "Ideen-Board",
  "suggestions.eyebrow": "Feature-Vorschläge",
  "suggestions.subtitle":
    "Ideen, die der Creator geprüft hat. Stimme für die ab, die du zuerst sehen willst. Abgelehnte Ideen bleiben sichtbar, damit man sieht, was warum nicht angenommen wurde.",
  "suggestions.submitCta": "Vorschlag einreichen",
  "suggestions.tab.approved": "Angenommen",
  "suggestions.tab.implemented": "Umgesetzt",
  "suggestions.tab.rejected": "Abgelehnt",
  "suggestions.empty.approved":
    "Noch keine angenommenen Ideen auf dem Board — reich eine ein.",
  "suggestions.empty.implemented":
    "Noch nichts umgesetzt. Angenommene und ausgelieferte Ideen erscheinen hier.",
  "suggestions.empty.rejected": "Noch keine abgelehnten Ideen.",

  "submit.title": "Workshop-Objekt einreichen",
  "submit.tagsEnglishDisclaimer":
    "Hinweis: Tags auf der Seite sind ausschließlich auf Englisch — aus Konsistenzgründen. Deine Einreichung selbst kann in jeder Sprache sein, nur die Tag-Bezeichnungen bleiben englisch.",

  "settings.title": "Einstellungen",
  "settings.language": "Sprache",
  "settings.languageHint":
    "Wechselt die Oberflächenbeschriftungen. Objekte und Tags behalten ihre Originalsprache — die stammen von anderen Nutzern.",
  "settings.tagsDisclaimer":
    "Tags sind auf der ganzen Seite immer auf Englisch. Objekte (Titel, Beschreibungen) behalten die Sprache, in der ihr Autor sie geschrieben hat.",

  "locale.picker.label": "Sprache",
};

const pl: Dictionary = {
  "nav.newest": "Najnowsze",
  "nav.browse": "Przeglądaj",
  "nav.search": "Szukaj",
  "nav.creators": "Twórcy",
  "nav.ideas": "Pomysły",
  "nav.whatsNew": "Co nowego",
  "nav.submit": "Dodaj",
  "nav.signIn": "Zaloguj przez Steam",

  "kind.blueprints": "Schematy",
  "kind.mods": "Mody",
  "kind.worlds": "Światy",
  "kind.challenges": "Wyzwania",
  "kind.tiles": "Kafle",
  "kind.customGames": "Gry niestandardowe",
  "kind.terrain": "Teren",
  "kind.other": "Inne",

  "home.heroTitle": "Znajdź to, co najlepsze z Warsztatu.",

  "suggestions.title": "Tablica pomysłów",
  "suggestions.eyebrow": "Propozycje funkcji",
  "suggestions.subtitle":
    "Pomysły, które przejrzał Twórca. Głosuj na te, które chcesz zobaczyć najszybciej. Odrzucone pomysły zostają widoczne — widać, co i dlaczego nie weszło.",
  "suggestions.submitCta": "Zaproponuj pomysł",
  "suggestions.tab.approved": "Zatwierdzone",
  "suggestions.tab.implemented": "Zrealizowane",
  "suggestions.tab.rejected": "Odrzucone",
  "suggestions.empty.approved":
    "Brak zatwierdzonych pomysłów — zaproponuj pierwszy.",
  "suggestions.empty.implemented":
    "Nic jeszcze nie zrealizowano. Tu trafiają pomysły zatwierdzone i wdrożone.",
  "suggestions.empty.rejected": "Brak odrzuconych pomysłów.",

  "submit.title": "Dodaj element z Warsztatu",
  "submit.tagsEnglishDisclaimer":
    "Uwaga: tagi na stronie są tylko po angielsku — dla spójności katalogu. Samo zgłoszenie może być w dowolnym języku, tylko etykiety tagów pozostają angielskie.",

  "settings.title": "Ustawienia",
  "settings.language": "Język",
  "settings.languageHint":
    "Przełącza etykiety interfejsu. Prace i tagi zachowują oryginalny język — piszą je inni użytkownicy.",
  "settings.tagsDisclaimer":
    "Tagi na całej stronie są zawsze po angielsku. Prace (tytuły, opisy) zachowują język, w jakim napisał je ich autor.",

  "locale.picker.label": "Język",
};

const DICTS: Record<Locale, Dictionary> = { en, ru, de, pl };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale];
}

export function translate(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
): string {
  // Falls back to English, then to the key itself, so a missing translation
  // degrades to readable text instead of an empty string.
  const raw = dict[key] ?? DICTS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
