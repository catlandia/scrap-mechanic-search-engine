import type { Locale } from "@/lib/prefs";

// Single flat dictionary per locale. Keys are dot-notation strings. Values may
// contain `{name}` placeholders that `t()` substitutes at call time.
//
// Quality note: these translations are a first-pass AI-assisted seed. They're
// good enough for short UI labels but native speakers should polish them —
// especially RU/DE/PL tone and longer copy. Long-form legal / moderation
// content (terms, privacy, guide, admin) is deliberately NOT translated here
// and remains English: machine-translating legal/moderation copy risks real
// harm.
export type Dictionary = Record<string, string>;

const en: Dictionary = {
  // Navigation
  "nav.newest": "Newest",
  "nav.browse": "Browse",
  "nav.search": "Search",
  "nav.creators": "Creators",
  "nav.ideas": "Ideas",
  "nav.whatsNew": "What's new",
  "nav.submit": "Submit",
  "nav.signIn": "Sign in with Steam",
  "nav.settings": "Settings",

  // Kinds
  "kind.blueprints": "Blueprints",
  "kind.mods": "Mods",
  "kind.worlds": "Worlds",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Terrain",
  "kind.other": "Other",

  // Home
  "home.heroTitle": "Find the good stuff from the Workshop.",
  "home.newestHeading": "Newest additions",
  "home.browseHeading": "Browse the catalogue",
  "home.viewAll": "View all →",
  "home.noItems": "No approved items yet.",

  // Generic
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.back": "Back",
  "common.remove": "Remove",
  "common.close": "Close",
  "common.signOut": "Sign out",
  "common.search": "Search",
  "common.clear": "Clear",
  "common.more": "More →",
  "common.newer": "← Newer",
  "common.older": "Older →",
  "common.page": "Page {n}",
  "common.submit": "Submit",

  // /new
  "newest.title": "Newest additions",
  "newest.subtitle": "Creations most recently approved, across every workshop kind.",

  // /creators
  "creators.title": "Creators",
  "creators.subtitle":
    "Workshop authors ranked by how many of their creations made it onto the site. Co-authored items count for everyone credited.",
  "creators.searchPlaceholder": "Search by name…",
  "creators.searchAria": "Search creators by name",
  "creators.noMatch": "No creators match \"{q}\".",
  "creators.empty": "No creators yet.",
  "creators.creationCountOne": "{count} creation",
  "creators.creationCountMany": "{count} creations",
  "creators.unknownName": "(unknown)",

  // /search
  "search.title": "Search",
  "search.placeholder": "Search titles and descriptions…",
  "search.noResults": "No approved creations match your filters.",

  // /me
  "me.favourites.title": "Your favourites",
  "me.favourites.empty": "Nothing favourited yet.",
  "me.submissions.title": "Your submissions",
  "me.submissions.empty": "You haven't submitted anything yet.",
  "me.notifications.title": "Your notifications",
  "me.notifications.empty": "No notifications yet.",
  "me.notifications.markAllRead": "Mark all read",

  // CreationCard badges / labels
  "card.communityBadge": "Community",
  "card.unratedLabel": "Unrated",
  "card.viewOnSteam": "View on Steam",

  // Creation detail page
  "creation.backToNewest": "← Back to newest",
  "creation.by": "by",
  "creation.viewOnSteamWorkshop": "View on Steam Workshop ↗",
  "creation.tagsHeading": "Tags",
  "creation.voteOnTagsHeading": "Vote on tags",
  "creation.communityAdded": "Community added",
  "creation.submittedBy": "submitted by",
  "creation.descriptionHeading": "Description",

  // BetaBanner
  "banner.dismiss": "Dismiss",

  // Ideas board (public)
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

  // Submit-a-suggestion form
  "suggestions.new.back": "← Ideas board",
  "suggestions.new.title": "Suggest a feature",
  "suggestions.new.subtitle":
    "Suggestions go privately to the Creator first. Approved ones land on the public board where everyone can upvote.",
  "suggestions.new.signInPrompt": "Sign in to submit a suggestion.",
  "suggestions.new.banned": "Your account is banned — suggestions are disabled.",
  "suggestions.new.muted": "You're muted — suggestions are disabled.",
  "suggestions.new.titleLabel": "Short title",
  "suggestions.new.titlePlaceholder": "e.g. Dark mode toggle on public pages",
  "suggestions.new.detailsLabel": "Details (optional)",
  "suggestions.new.detailsPlaceholder":
    "Why this matters, how you'd imagine it working, any edge cases.",
  "suggestions.new.imageLabel": "Image (optional)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF, 500 KB max",
  "suggestions.new.imageHelper":
    "A mockup, screenshot, or sketch helps the Creator understand layout requests faster than words alone.",
  "suggestions.new.send": "Send to Creator",
  "suggestions.new.sending": "Sending…",
  "suggestions.new.thanks":
    "Thanks — the Creator will review it. Approved suggestions appear on the public board.",

  // Submit-a-Workshop-item page
  "submit.eyebrow": "Submit a creation",
  "submit.title": "Suggest a Workshop item",
  "submit.signedOut": "You need to be signed in to submit.",
  "submit.banned": "Your account is currently banned — submissions are disabled.",
  "submit.muted": "You're currently muted — submissions are disabled.",
  "submit.tagsEnglishDisclaimer":
    "Your item's title and description can be in any language — the Workshop page is rendered as-is. Tags applied during review are English-only so the catalogue stays consistent across every UI language.",

  // Settings page
  "settings.eyebrow": "Settings",
  "settings.heading": "Your preferences",
  "settings.intro":
    "Every setting here is stored in a browser cookie — no account required. If you clear cookies, everything resets to the defaults.",
  "settings.language": "Language",
  "settings.languageHint":
    "Switches UI labels. Creations and tags keep their original language — those are authored by other users.",
  "settings.tagsDisclaimer":
    "Tags across the site are always in English. Creations (titles, descriptions) keep whatever language their author wrote.",
  "settings.theme": "Theme",
  "settings.themeHint": "How the whole site looks.",
  "settings.themeCurrently": "Currently using {name}. Want your own palette?",
  "settings.customizeTheme": "Customize your theme →",
  "settings.ratings": "Ratings",
  "settings.ratingsHint":
    "Which rating do you want to see on each creation card — Steam's global vote, the site's own vote, or both?",
  "settings.account": "Your account",
  "settings.accountHint": "Stuff linked to your Steam account.",
  "settings.profileLink": "Your public profile →",
  "settings.favouritesLink": "Your favourites →",
  "settings.submissionsLink": "Your submissions →",
  "settings.notificationsLink": "Your notifications →",
  "settings.helpInfo": "Help & info",
  "settings.helpHint": "Need a refresher on how the site works?",
  "settings.quickGuide": "Quick guide →",
  "settings.ideasBoardLink": "Ideas board →",
  "settings.terms": "Terms",
  "settings.privacy": "Privacy",

  // Footer
  "footer.online": "{online} online",
  "footer.signedInTotal": "{total} signed-in users total",

  // Locale picker
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
  "nav.settings": "Настройки",

  "kind.blueprints": "Чертежи",
  "kind.mods": "Моды",
  "kind.worlds": "Миры",
  "kind.challenges": "Задания",
  "kind.tiles": "Тайлы",
  "kind.customGames": "Кастомные игры",
  "kind.terrain": "Рельеф",
  "kind.other": "Прочее",

  "home.heroTitle": "Найдите лучшее из Мастерской.",
  "home.newestHeading": "Последние поступления",
  "home.browseHeading": "Смотреть каталог",
  "home.viewAll": "Смотреть всё →",
  "home.noItems": "Пока нет одобренных объектов.",

  "common.loading": "Загрузка…",
  "common.save": "Сохранить",
  "common.cancel": "Отмена",
  "common.delete": "Удалить",
  "common.back": "Назад",
  "common.remove": "Убрать",
  "common.close": "Закрыть",
  "common.signOut": "Выйти",
  "common.search": "Искать",
  "common.clear": "Очистить",
  "common.more": "Ещё →",
  "common.newer": "← Новее",
  "common.older": "Старее →",
  "common.page": "Страница {n}",
  "common.submit": "Отправить",

  "newest.title": "Последние поступления",
  "newest.subtitle": "Недавно одобренные объекты по всем типам Мастерской.",

  "creators.title": "Авторы",
  "creators.subtitle":
    "Авторы Мастерской, отсортированные по числу их работ на сайте. Совместные работы учитываются каждому соавтору.",
  "creators.searchPlaceholder": "Поиск по имени…",
  "creators.searchAria": "Поиск авторов по имени",
  "creators.noMatch": "Авторы не найдены: «{q}».",
  "creators.empty": "Авторов пока нет.",
  "creators.creationCountOne": "{count} объект",
  "creators.creationCountMany": "{count} объектов",
  "creators.unknownName": "(без имени)",

  "search.title": "Поиск",
  "search.placeholder": "Ищите по названиям и описаниям…",
  "search.noResults": "Под ваши фильтры ничего не найдено.",

  "me.favourites.title": "Ваши избранные",
  "me.favourites.empty": "В избранном пока пусто.",
  "me.submissions.title": "Ваши заявки",
  "me.submissions.empty": "Вы пока ничего не добавили.",
  "me.notifications.title": "Ваши уведомления",
  "me.notifications.empty": "Уведомлений пока нет.",
  "me.notifications.markAllRead": "Отметить все как прочитанные",

  "card.communityBadge": "Сообщество",
  "card.unratedLabel": "Без оценки",
  "card.viewOnSteam": "Открыть в Steam",

  "creation.backToNewest": "← К новым",
  "creation.by": "от",
  "creation.viewOnSteamWorkshop": "Открыть в Мастерской Steam ↗",
  "creation.tagsHeading": "Теги",
  "creation.voteOnTagsHeading": "Голосовать за теги",
  "creation.communityAdded": "Добавлено сообществом",
  "creation.submittedBy": "добавил",
  "creation.descriptionHeading": "Описание",

  "banner.dismiss": "Скрыть",

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

  "suggestions.new.back": "← К доске идей",
  "suggestions.new.title": "Предложите функцию",
  "suggestions.new.subtitle":
    "Предложения сначала приходят автору сайта. Одобренные попадают на публичную доску, где за них могут голосовать все.",
  "suggestions.new.signInPrompt": "Войдите, чтобы предложить идею.",
  "suggestions.new.banned": "Ваш аккаунт заблокирован — предложения отключены.",
  "suggestions.new.muted": "У вас действует заглушение — предложения отключены.",
  "suggestions.new.titleLabel": "Короткий заголовок",
  "suggestions.new.titlePlaceholder": "напр. Переключатель тёмной темы на публичных страницах",
  "suggestions.new.detailsLabel": "Подробности (по желанию)",
  "suggestions.new.detailsPlaceholder":
    "Почему это важно, как вы представляете реализацию, краевые случаи.",
  "suggestions.new.imageLabel": "Изображение (по желанию)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF, до 500 КБ",
  "suggestions.new.imageHelper":
    "Макет, скриншот или эскиз помогут автору сайта понять запрос по расположению элементов быстрее, чем слова.",
  "suggestions.new.send": "Отправить автору",
  "suggestions.new.sending": "Отправка…",
  "suggestions.new.thanks":
    "Спасибо — автор сайта рассмотрит это. Одобренные предложения появляются на публичной доске.",

  "submit.eyebrow": "Добавление объекта",
  "submit.title": "Предложите предмет из Мастерской",
  "submit.signedOut": "Чтобы добавить, нужно войти.",
  "submit.banned": "Ваш аккаунт заблокирован — добавление отключено.",
  "submit.muted": "У вас действует заглушение — добавление отключено.",
  "submit.tagsEnglishDisclaimer":
    "Название и описание объекта могут быть на любом языке — страница Мастерской показывается как есть. Теги, назначаемые при проверке, только на английском, чтобы каталог оставался единым для всех языков интерфейса.",

  "settings.eyebrow": "Настройки",
  "settings.heading": "Ваши предпочтения",
  "settings.intro":
    "Все настройки хранятся в cookie браузера — аккаунт не нужен. Если очистить cookie, всё вернётся к значениям по умолчанию.",
  "settings.language": "Язык",
  "settings.languageHint":
    "Переключает подписи интерфейса. Объекты и теги сохраняют свой язык — их пишут другие пользователи.",
  "settings.tagsDisclaimer":
    "Теги на сайте всегда на английском. Объекты (названия, описания) остаются на том языке, на котором их написал автор.",
  "settings.theme": "Тема",
  "settings.themeHint": "Как выглядит сайт целиком.",
  "settings.themeCurrently": "Сейчас: {name}. Хотите свою палитру?",
  "settings.customizeTheme": "Настроить свою тему →",
  "settings.ratings": "Оценки",
  "settings.ratingsHint":
    "Какую оценку показывать на карточках — глобальный голос Steam, голос сайта или обе?",
  "settings.account": "Ваш аккаунт",
  "settings.accountHint": "Всё, что связано с вашим аккаунтом Steam.",
  "settings.profileLink": "Ваш публичный профиль →",
  "settings.favouritesLink": "Ваши избранные →",
  "settings.submissionsLink": "Ваши заявки →",
  "settings.notificationsLink": "Ваши уведомления →",
  "settings.helpInfo": "Справка и сведения",
  "settings.helpHint": "Хотите освежить, как работает сайт?",
  "settings.quickGuide": "Краткое руководство →",
  "settings.ideasBoardLink": "Доска идей →",
  "settings.terms": "Условия",
  "settings.privacy": "Конфиденциальность",

  "footer.online": "{online} онлайн",
  "footer.signedInTotal": "всего {total} зарегистрированных",

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
  "nav.settings": "Einstellungen",

  "kind.blueprints": "Blaupausen",
  "kind.mods": "Mods",
  "kind.worlds": "Welten",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Gelände",
  "kind.other": "Sonstiges",

  "home.heroTitle": "Finde das Gute aus dem Workshop.",
  "home.newestHeading": "Neueste Einträge",
  "home.browseHeading": "Katalog durchstöbern",
  "home.viewAll": "Alle ansehen →",
  "home.noItems": "Noch keine freigegebenen Einträge.",

  "common.loading": "Lädt…",
  "common.save": "Speichern",
  "common.cancel": "Abbrechen",
  "common.delete": "Löschen",
  "common.back": "Zurück",
  "common.remove": "Entfernen",
  "common.close": "Schließen",
  "common.signOut": "Abmelden",
  "common.search": "Suchen",
  "common.clear": "Leeren",
  "common.more": "Mehr →",
  "common.newer": "← Neuer",
  "common.older": "Älter →",
  "common.page": "Seite {n}",
  "common.submit": "Absenden",

  "newest.title": "Neueste Einträge",
  "newest.subtitle": "Kürzlich freigegebene Objekte, über alle Workshop-Arten.",

  "creators.title": "Ersteller",
  "creators.subtitle":
    "Workshop-Autoren, sortiert nach Anzahl ihrer Einträge auf der Seite. Koautorenschaft zählt für alle Beteiligten.",
  "creators.searchPlaceholder": "Nach Namen suchen…",
  "creators.searchAria": "Ersteller nach Namen suchen",
  "creators.noMatch": "Keine Ersteller zu „{q}\".",
  "creators.empty": "Noch keine Ersteller.",
  "creators.creationCountOne": "{count} Eintrag",
  "creators.creationCountMany": "{count} Einträge",
  "creators.unknownName": "(unbekannt)",

  "search.title": "Suche",
  "search.placeholder": "Titel und Beschreibungen durchsuchen…",
  "search.noResults": "Keine freigegebenen Einträge passen zu deinen Filtern.",

  "me.favourites.title": "Deine Favoriten",
  "me.favourites.empty": "Noch nichts favorisiert.",
  "me.submissions.title": "Deine Einreichungen",
  "me.submissions.empty": "Du hast noch nichts eingereicht.",
  "me.notifications.title": "Deine Benachrichtigungen",
  "me.notifications.empty": "Noch keine Benachrichtigungen.",
  "me.notifications.markAllRead": "Alle als gelesen markieren",

  "card.communityBadge": "Community",
  "card.unratedLabel": "Ohne Bewertung",
  "card.viewOnSteam": "Auf Steam ansehen",

  "creation.backToNewest": "← Zurück zu Neueste",
  "creation.by": "von",
  "creation.viewOnSteamWorkshop": "Im Steam Workshop ansehen ↗",
  "creation.tagsHeading": "Tags",
  "creation.voteOnTagsHeading": "Über Tags abstimmen",
  "creation.communityAdded": "Von Community hinzugefügt",
  "creation.submittedBy": "eingereicht von",
  "creation.descriptionHeading": "Beschreibung",

  "banner.dismiss": "Ausblenden",

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

  "suggestions.new.back": "← Zum Ideen-Board",
  "suggestions.new.title": "Feature vorschlagen",
  "suggestions.new.subtitle":
    "Vorschläge gehen zuerst privat an den Creator. Angenommene landen auf dem öffentlichen Board, wo jeder abstimmen kann.",
  "suggestions.new.signInPrompt": "Melde dich an, um einen Vorschlag einzureichen.",
  "suggestions.new.banned": "Dein Konto ist gesperrt — Vorschläge sind deaktiviert.",
  "suggestions.new.muted": "Du bist stummgeschaltet — Vorschläge sind deaktiviert.",
  "suggestions.new.titleLabel": "Kurztitel",
  "suggestions.new.titlePlaceholder": "z. B. Dark-Mode-Schalter auf öffentlichen Seiten",
  "suggestions.new.detailsLabel": "Details (optional)",
  "suggestions.new.detailsPlaceholder":
    "Warum es wichtig ist, wie du es dir vorstellst, eventuelle Sonderfälle.",
  "suggestions.new.imageLabel": "Bild (optional)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF, max. 500 KB",
  "suggestions.new.imageHelper":
    "Ein Mockup, Screenshot oder Skizze hilft dem Creator, Layout-Wünsche schneller zu verstehen als Worte.",
  "suggestions.new.send": "An Creator senden",
  "suggestions.new.sending": "Wird gesendet…",
  "suggestions.new.thanks":
    "Danke — der Creator schaut es sich an. Angenommene Vorschläge erscheinen auf dem öffentlichen Board.",

  "submit.eyebrow": "Eintrag einreichen",
  "submit.title": "Workshop-Objekt vorschlagen",
  "submit.signedOut": "Du musst angemeldet sein, um einzureichen.",
  "submit.banned": "Dein Konto ist gesperrt — Einreichungen sind deaktiviert.",
  "submit.muted": "Du bist stummgeschaltet — Einreichungen sind deaktiviert.",
  "submit.tagsEnglishDisclaimer":
    "Titel und Beschreibung deines Objekts können in jeder Sprache sein — die Workshop-Seite wird so angezeigt, wie sie ist. Tags, die bei der Prüfung vergeben werden, sind ausschließlich auf Englisch, damit der Katalog in jeder UI-Sprache konsistent bleibt.",

  "settings.eyebrow": "Einstellungen",
  "settings.heading": "Deine Präferenzen",
  "settings.intro":
    "Jede Einstellung hier liegt in einem Browser-Cookie — kein Konto nötig. Wenn du Cookies löschst, wird alles auf die Standardwerte zurückgesetzt.",
  "settings.language": "Sprache",
  "settings.languageHint":
    "Wechselt die Oberflächenbeschriftungen. Objekte und Tags behalten ihre Originalsprache — die stammen von anderen Nutzern.",
  "settings.tagsDisclaimer":
    "Tags sind auf der ganzen Seite immer auf Englisch. Objekte (Titel, Beschreibungen) behalten die Sprache, in der ihr Autor sie geschrieben hat.",
  "settings.theme": "Design",
  "settings.themeHint": "Wie die ganze Seite aussieht.",
  "settings.themeCurrently": "Aktuell: {name}. Eigene Palette?",
  "settings.customizeTheme": "Design anpassen →",
  "settings.ratings": "Bewertungen",
  "settings.ratingsHint":
    "Welche Bewertung soll auf jeder Karte angezeigt werden — Steams globale Stimmen, die der Seite, oder beides?",
  "settings.account": "Dein Konto",
  "settings.accountHint": "Alles, was mit deinem Steam-Konto verknüpft ist.",
  "settings.profileLink": "Dein öffentliches Profil →",
  "settings.favouritesLink": "Deine Favoriten →",
  "settings.submissionsLink": "Deine Einreichungen →",
  "settings.notificationsLink": "Deine Benachrichtigungen →",
  "settings.helpInfo": "Hilfe & Infos",
  "settings.helpHint": "Auffrischung, wie die Seite funktioniert?",
  "settings.quickGuide": "Kurzanleitung →",
  "settings.ideasBoardLink": "Ideen-Board →",
  "settings.terms": "Nutzungsbedingungen",
  "settings.privacy": "Datenschutz",

  "footer.online": "{online} online",
  "footer.signedInTotal": "insgesamt {total} angemeldet",

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
  "nav.settings": "Ustawienia",

  "kind.blueprints": "Schematy",
  "kind.mods": "Mody",
  "kind.worlds": "Światy",
  "kind.challenges": "Wyzwania",
  "kind.tiles": "Kafle",
  "kind.customGames": "Gry niestandardowe",
  "kind.terrain": "Teren",
  "kind.other": "Inne",

  "home.heroTitle": "Znajdź to, co najlepsze z Warsztatu.",
  "home.newestHeading": "Najnowsze pozycje",
  "home.browseHeading": "Przeglądaj katalog",
  "home.viewAll": "Zobacz wszystko →",
  "home.noItems": "Brak zatwierdzonych pozycji.",

  "common.loading": "Ładowanie…",
  "common.save": "Zapisz",
  "common.cancel": "Anuluj",
  "common.delete": "Usuń",
  "common.back": "Wstecz",
  "common.remove": "Usuń",
  "common.close": "Zamknij",
  "common.signOut": "Wyloguj",
  "common.search": "Szukaj",
  "common.clear": "Wyczyść",
  "common.more": "Więcej →",
  "common.newer": "← Nowsze",
  "common.older": "Starsze →",
  "common.page": "Strona {n}",
  "common.submit": "Wyślij",

  "newest.title": "Najnowsze pozycje",
  "newest.subtitle": "Ostatnio zatwierdzone prace we wszystkich kategoriach Warsztatu.",

  "creators.title": "Twórcy",
  "creators.subtitle":
    "Autorzy Warsztatu uporządkowani według liczby prac, które trafiły na stronę. Prace ze współautorami liczą się każdemu.",
  "creators.searchPlaceholder": "Szukaj po nazwie…",
  "creators.searchAria": "Szukaj twórców po nazwie",
  "creators.noMatch": "Brak twórców pasujących do „{q}\".",
  "creators.empty": "Nie ma jeszcze twórców.",
  "creators.creationCountOne": "{count} praca",
  "creators.creationCountMany": "{count} prac",
  "creators.unknownName": "(nieznany)",

  "search.title": "Szukaj",
  "search.placeholder": "Przeszukuj tytuły i opisy…",
  "search.noResults": "Brak zatwierdzonych prac pasujących do filtrów.",

  "me.favourites.title": "Twoje ulubione",
  "me.favourites.empty": "Nic jeszcze nie polubiono.",
  "me.submissions.title": "Twoje zgłoszenia",
  "me.submissions.empty": "Nic jeszcze nie zgłoszono.",
  "me.notifications.title": "Twoje powiadomienia",
  "me.notifications.empty": "Brak powiadomień.",
  "me.notifications.markAllRead": "Oznacz wszystkie jako przeczytane",

  "card.communityBadge": "Społeczność",
  "card.unratedLabel": "Bez oceny",
  "card.viewOnSteam": "Zobacz na Steam",

  "creation.backToNewest": "← Do najnowszych",
  "creation.by": "autor:",
  "creation.viewOnSteamWorkshop": "Zobacz w Warsztacie Steam ↗",
  "creation.tagsHeading": "Tagi",
  "creation.voteOnTagsHeading": "Głosuj na tagi",
  "creation.communityAdded": "Dodane przez społeczność",
  "creation.submittedBy": "zgłoszone przez",
  "creation.descriptionHeading": "Opis",

  "banner.dismiss": "Zamknij",

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

  "suggestions.new.back": "← Do tablicy pomysłów",
  "suggestions.new.title": "Zaproponuj funkcję",
  "suggestions.new.subtitle":
    "Propozycje trafiają najpierw prywatnie do Twórcy. Zatwierdzone lądują na publicznej tablicy, gdzie każdy może głosować.",
  "suggestions.new.signInPrompt": "Zaloguj się, aby zgłosić pomysł.",
  "suggestions.new.banned": "Twoje konto jest zbanowane — zgłoszenia są wyłączone.",
  "suggestions.new.muted": "Masz wyciszenie — zgłoszenia są wyłączone.",
  "suggestions.new.titleLabel": "Krótki tytuł",
  "suggestions.new.titlePlaceholder": "np. Przełącznik trybu ciemnego na stronach publicznych",
  "suggestions.new.detailsLabel": "Szczegóły (opcjonalnie)",
  "suggestions.new.detailsPlaceholder":
    "Dlaczego to ważne, jak to sobie wyobrażasz, przypadki szczególne.",
  "suggestions.new.imageLabel": "Obraz (opcjonalnie)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF, maks. 500 KB",
  "suggestions.new.imageHelper":
    "Makieta, zrzut ekranu lub szkic pomoże Twórcy szybciej zrozumieć prośby o układ niż same słowa.",
  "suggestions.new.send": "Wyślij do Twórcy",
  "suggestions.new.sending": "Wysyłanie…",
  "suggestions.new.thanks":
    "Dzięki — Twórca to sprawdzi. Zatwierdzone propozycje pojawiają się na publicznej tablicy.",

  "submit.eyebrow": "Zgłoś pracę",
  "submit.title": "Zaproponuj element z Warsztatu",
  "submit.signedOut": "Musisz być zalogowany, aby zgłosić.",
  "submit.banned": "Twoje konto jest zbanowane — zgłoszenia są wyłączone.",
  "submit.muted": "Masz wyciszenie — zgłoszenia są wyłączone.",
  "submit.tagsEnglishDisclaimer":
    "Tytuł i opis pozycji mogą być w dowolnym języku — strona Warsztatu jest renderowana tak, jak jest. Tagi przypisywane podczas recenzji są tylko po angielsku, aby katalog pozostał spójny w każdym języku interfejsu.",

  "settings.eyebrow": "Ustawienia",
  "settings.heading": "Twoje preferencje",
  "settings.intro":
    "Każde ustawienie jest zapisane w ciasteczku przeglądarki — konto nie jest wymagane. Wyczyszczenie ciasteczek przywraca wartości domyślne.",
  "settings.language": "Język",
  "settings.languageHint":
    "Przełącza etykiety interfejsu. Prace i tagi zachowują oryginalny język — piszą je inni użytkownicy.",
  "settings.tagsDisclaimer":
    "Tagi na całej stronie są zawsze po angielsku. Prace (tytuły, opisy) zachowują język, w jakim napisał je ich autor.",
  "settings.theme": "Motyw",
  "settings.themeHint": "Jak wygląda cała strona.",
  "settings.themeCurrently": "Aktualnie: {name}. Własna paleta?",
  "settings.customizeTheme": "Dostosuj motyw →",
  "settings.ratings": "Oceny",
  "settings.ratingsHint":
    "Którą ocenę chcesz widzieć na każdej karcie — globalny głos Steama, głos serwisu, czy obie?",
  "settings.account": "Twoje konto",
  "settings.accountHint": "Rzeczy powiązane z Twoim kontem Steam.",
  "settings.profileLink": "Twój profil publiczny →",
  "settings.favouritesLink": "Twoje ulubione →",
  "settings.submissionsLink": "Twoje zgłoszenia →",
  "settings.notificationsLink": "Twoje powiadomienia →",
  "settings.helpInfo": "Pomoc i informacje",
  "settings.helpHint": "Odświeżenie, jak działa strona?",
  "settings.quickGuide": "Krótki przewodnik →",
  "settings.ideasBoardLink": "Tablica pomysłów →",
  "settings.terms": "Regulamin",
  "settings.privacy": "Prywatność",

  "footer.online": "{online} online",
  "footer.signedInTotal": "łącznie {total} zalogowanych",

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
