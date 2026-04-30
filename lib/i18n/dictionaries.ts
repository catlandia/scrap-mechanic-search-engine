import type { Locale } from "@/lib/prefs";

// Single flat dictionary per locale. Keys are dot-notation strings. Values may
// contain `{name}` placeholders that `t()` substitutes at call time.
//
// Quality note: these translations are a first-pass AI-assisted seed. They're
// good enough for short UI labels but native speakers should polish them —
// especially the longer prose. /guide and /admin/* are still English-only.
export type Dictionary = Record<string, string>;

const en: Dictionary = {
  // Navigation
  "nav.newest": "Newest",
  "nav.browse": "Browse",
  "nav.search": "Search",
  "nav.creators": "Creators",
  "nav.ideas": "Ideas",
  "nav.whatsNew": "What's new",
  "nav.reviews": "Reviews",
  "nav.submit": "Submit",
  "nav.signIn": "Sign in with Steam",
  "nav.settings": "Settings",
  "nav.minigames": "Minigames & Others",
  "nav.adminTriage": "Admin triage",
  "nav.about": "About the site",
  "nav.guide": "How to use the site",
  "nav.support": "Support the site",
  "nav.favourites": "Your favourites",
  "nav.notifications": "Notifications",
  "nav.submissions": "Your submissions",

  // Kinds (plural — category listing)
  "kind.blueprints": "Blueprints",
  "kind.mods": "Mods",
  "kind.worlds": "Worlds",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Terrain",
  "kind.other": "Other",

  // Kinds (singular — used in RSS category labels, per-item badges, etc.)
  "kind.blueprint": "Blueprint",
  "kind.mod": "Mod",
  "kind.world": "World",
  "kind.challenge": "Challenge",
  "kind.tile": "Tile",
  "kind.customGame": "Custom Game",
  "kind.terrainAsset": "Terrain",
  "kind.creationFallback": "Creation",

  // RSS feed
  "rss.title": "Scrap Mechanic Search Engine — Newest",
  "rss.description":
    "Newest approved Scrap Mechanic Steam Workshop creations on the Scrap Mechanic Search Engine.",
  "rss.by": "by",

  // /submit
  "submit.metadataTitle": "Submit a creation — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "Submit a Scrap Mechanic Steam Workshop creation the cron hasn't found yet. Approved items appear on the public feed with a Community badge crediting you.",
  "submit.introBefore":
    "Got a gem the cron hasn't found yet? Submit any Steam Workshop URL or id — a moderator will review it and it'll land on the public feed with a",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "badge crediting you.",
  "submit.privateProfileTitle": "We couldn't verify your Steam account age.",
  "submit.privateProfileBody":
    "Your Steam profile is private, so the account-creation date is hidden. Make your profile public and sign in again — or send a moderator a quick appeal and they'll flip the gate on your account manually.",
  "submit.privateProfileAppeal": "Appeal the age gate →",
  "submit.tooYoungTitle": "Your Steam account is less than 7 days old.",
  "submit.tooYoungBody":
    "This is a hard-coded cooldown to stop fresh sock-puppet accounts from spamming the site. It's not something a moderator can bypass for the too-new case — you just have to wait it out.",
  "submit.tooYoungBodyStrong": "not something a moderator can bypass",
  "submit.tooYoungClearsOn":
    "Your account clears the gate on {date}. Come back then.",
  "submit.acceptedForms": "Accepted forms",
  "submit.queueExplain":
    "Submitted items go into the mod triage queue. They appear publicly once approved; the cron won't also try to re-ingest them.",
  "submit.curious": "Curious what gets in and why?",
  "submit.howItWorks": "How it works",
  "submit.form.urlLabel": "Steam Workshop URL or published-file ID",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "Submitting…",
  "submit.form.submitButton": "Submit for review",
  "submit.form.successToast":
    "Submitted — a moderator will review it shortly.",
  "submit.form.errorToast": "Couldn't submit. Try again or check the URL.",
  "submit.form.queuedToast": "{title} queued for mod review.",
  "submit.form.pendingBefore": "Thanks —",
  "submit.form.pendingAfter": "is now pending mod review.",
  "submit.form.backHome": "Back to home ↗",

  // Home
  "home.heroTitle": "Find the good stuff from the Workshop.",
  "home.newestHeading": "Newest additions",
  "home.browseHeading": "Browse the catalogue",
  "home.viewAll": "View all →",
  "compare.heading": "Compare",
  "compare.subheading": "Comparing {count} creations",
  "compare.field": "Field",
  "compare.fieldKind": "Kind",
  "compare.fieldAuthor": "Author",
  "compare.fieldSubs": "Subscribers",
  "compare.fieldFavorites": "Favourites",
  "compare.fieldRating": "Rating",
  "compare.fieldSiteNet": "Site upvotes (net)",
  "compare.fieldOnSteam": "Created on Steam",
  "compare.fieldOnSite": "Approved on site",
  "compare.fieldTags": "Tags",
  "compare.fieldLinks": "Links",
  "compare.openOnSite": "Open ↗",
  "compare.add": "Compare",
  "compare.inBasket": "In basket",
  "compare.added": "Added to compare basket",
  "compare.removed": "Removed from compare basket",
  "compare.replacedOldest": "Basket full — replaced the oldest item",
  "compare.addAria": "Add this creation to the compare basket",
  "compare.removeAria": "Remove this creation from the compare basket",
  "compare.basketLabel": "{count} in basket",
  "compare.basketHint": "Add one more",
  "compare.openButton": "Compare →",
  "compare.clearAria": "Clear compare basket",
  "compare.emptyHelp": "Add at least 2 creations to your compare basket from any creation page.",
  "compare.needTwo": "Add at least one more creation to compare.",
  "compare.browseLink": "Browse creations",
  "home.surpriseMe": "Surprise me",
  "home.surpriseMeHint": "Jump to a random creation",
  "author.totalCreations": "Creations",
  "author.totalSubs": "Total subscribers",
  "author.kindBreakdown": "By kind",
  "author.topCreation": "Top creation",
  "rss.titleByAuthor": "Newest from {name}",
  "rss.descriptionByAuthor": "Newest approved Scrap Mechanic Workshop creations from {name}.",
  "rss.titleByTag": "Newest tagged #{tag}",
  "rss.descriptionByTag": "Newest approved Scrap Mechanic Workshop creations tagged #{tag}.",
  "home.forYouHeading": "For you",
  "home.forYouHint": "Picked from your favourites and votes",
  "home.trendingHeading": "Trending",
  "home.trendingHint": "Top picks across the site",
  "profile.recentComments": "Recent comments",
  "profile.commentOnWall": "on {name}'s wall",
  "profile.commentDeleted": "[deleted]",
  "profile.commentDeletedTarget": "[deleted target]",
  "home.noItems": "No approved items yet.",
  "home.supportCalloutBefore":
    "Want to help keep this project growing? Head over to",
  "home.supportCalloutLink": "Support the site",
  "home.supportCalloutAfter": "to see concrete ways you can pitch in.",
  "home.descriptionBefore":
    "Hand-curated Blueprints, Mods, Worlds, and more. Combine tags like",
  "home.descriptionExample1": "house + car",
  "home.descriptionBetween": "to find a drivable camper — or",
  "home.descriptionExample2": "walker + mech",
  "home.descriptionAfter":
    "for a hexapod. Low-effort creations are filtered out.",
  "home.indexedOne": "{count} creation indexed",
  "home.indexedMany": "{count} creations indexed",
  "home.emptyState":
    "No approved creations yet. Kick off an ingest and review the queue.",
  "home.popularBlueprints": "Popular Blueprints",
  "home.popularMods": "Popular Mods",
  "home.popularWorlds": "Popular Worlds",
  "home.popularChallenges": "Popular Challenges",

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
  "creators.filterAll": "All kinds",
  "creators.filterAria": "Filter creators by kind",

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
  // Minigames
  "minigames.eyebrow": "Break room",
  "minigames.title": "Minigames & Others",
  "minigames.subtitle":
    "Small Scrap Mechanic-themed diversions plus a few assorted oddities that live on the site. New ones show up here as they're built.",
  "minigames.playLabel": "Play",
  "minigames.othersLabel": "Other",
  "minigames.gamesHeading": "Games",
  "minigames.othersHeading": "Others",
  "minigames.comingSoon": "More coming soon",
  "minigames.backToIndex": "← Minigames",
  "minigames.reset": "Reset stats",
  "minigames.statsLabel": "Session stats",
  "minigames.stat.streak": "Streak",
  "minigames.stat.bestStreak": "Best",
  "minigames.stat.rounds": "Rounds",
  "minigames.stat.accuracy": "Accuracy",
  "minigames.whoIsThis": "Who is this?",
  "minigames.zoomAria": "Tap to zoom in on the image",
  "minigames.zoomHint": "Tap to zoom",
  "minigames.zoomDialogLabel": "Zoomed character image",
  "minigames.wrongReset": "Wrong — streak reset.",
  "minigames.roundWon": "Round won! Next round…",
  "minigames.scrapcha.name": "Scrapcha",
  "minigames.scrapcha.blurb":
    "Identify Scrap Mechanic characters from screenshots. Same puzzle the sign-in captcha uses, but endless — how long can you keep your streak alive?",
  "minigames.scrapcha.subtitle":
    "Pick the character in the screenshot. One wrong answer resets your streak — how far can you push it?",
  "minigames.blockdle.name": "Blockdle",
  "minigames.blockdle.blurb":
    "Near-impossible Scrap Mechanic info guesser. Nine clues, ten tries, 500+ blocks.",
  "minigames.blockdle.subtitle":
    "Guess the block. Stats tell you how close you are — green means match, arrows point you toward the answer.",
  "minigames.blockdle.mode.daily": "Daily",
  "minigames.blockdle.mode.endless": "Endless",
  "minigames.blockdle.inputPlaceholder": "Type a block name…",
  "minigames.blockdle.submit": "Guess",
  "minigames.blockdle.attemptsRemaining": "{n} left",
  "minigames.blockdle.col.icon": "Icon",
  "minigames.blockdle.col.name": "Name",
  "minigames.blockdle.col.inventoryType": "Inv. Type",
  "minigames.blockdle.col.category": "Category",
  "minigames.blockdle.col.material": "Material",
  "minigames.blockdle.col.flammable": "Flammable",
  "minigames.blockdle.col.level": "Level",
  "minigames.blockdle.col.durability": "Durab.",
  "minigames.blockdle.col.density": "Dens.",
  "minigames.blockdle.col.friction": "Frict.",
  "minigames.blockdle.col.buoyancy": "Buoy.",
  "minigames.blockdle.flammable.yes": "Yes",
  "minigames.blockdle.flammable.no": "No",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "Today's leaderboard",
  "minigames.blockdle.leaderboard.subtitle": "Signed-in winners, fewest guesses first. Resets every UTC midnight.",
  "minigames.blockdle.leaderboard.count": "{n} finishers",
  "minigames.blockdle.leaderboard.empty": "No finishers yet today — be the first!",
  "minigames.blockdle.leaderboard.guesses": "{n} tries",
  "minigames.blockdle.leaderboard.allTimeTitle": "All-time champions",
  "minigames.blockdle.leaderboard.allTimeSubtitle": "Everyone who's ever cleared a daily. Ranked by total wins, tiebreak on fewest average guesses.",
  "minigames.blockdle.leaderboard.allTimeEmpty": "No one's cleared a daily yet.",
  "minigames.blockdle.leaderboard.wins": "{n} wins",
  "minigames.blockdle.leaderboard.avg": "avg {n} tries",
  "minigames.blockdle.win.title": "Solved!",
  "minigames.blockdle.win.body": "Got it in {n}/{max}.",
  "minigames.blockdle.lose.title": "Out of guesses",
  "minigames.blockdle.lose.body": "The answer was {name}.",
  "minigames.blockdle.reveal.label": "Answer",
  "minigames.blockdle.share.button": "Share result",
  "minigames.blockdle.share.copied": "Copied to clipboard",
  "minigames.blockdle.daily.cta.endless": "Play endless →",
  "minigames.blockdle.daily.cta.tomorrow": "Come back tomorrow for a new block",
  "minigames.blockdle.endless.cta.next": "Next block →",
  "minigames.blockdle.error.unknownBlock": "That's not a block we know.",
  "minigames.blockdle.error.duplicate": "Already guessed.",
  "minigames.blockdle.stat.wins": "Wins",
  "minigames.blockdle.stat.losses": "Losses",

  "minigames.silence.name": "Scrap Mechanic silence",
  "minigames.silence.blurb":
    "How long since Axolot posted anything to the Steam news feed? The counter is ticking.",
  "minigames.silence.title": "Time since the last Scrap Mechanic news",
  "minigames.silence.subtitle":
    "Live counter reading from the official Steam news feed for Scrap Mechanic (appid 387990). Patch, announcement, dev diary — whatever lands, resets the clock.",
  "minigames.silence.months": "Months",
  "minigames.silence.days": "Days",
  "minigames.silence.hours": "Hours",
  "minigames.silence.minutes": "Minutes",
  "minigames.silence.seconds": "Seconds",
  "minigames.silence.totalSeconds": "{n} seconds total.",
  "minigames.silence.lastNewsLabel": "Latest news item",
  "minigames.silence.disclaimer":
    "A \"month\" here is a 30-day bucket — the vibe matters more than the calendar does. Data refreshes server-side every 10 minutes.",
  "minigames.silence.error":
    "Couldn't reach the Steam news feed right now. Try again in a few minutes.",

  "creation.backToNewest": "← Back to newest",
  "creation.by": "by",
  "creation.viewOnSteamWorkshop": "View on Steam Workshop ↗",
  "creation.share": "Share",
  "creation.shareAria": "Copy a link to this creation",
  "creation.shareCopied": "Link copied to clipboard.",
  "creation.shareCopiedShort": "Copied",
  "creation.shareFailed": "Could not copy link.",
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
  "settings.supportLink": "Support the site →",
  "settings.terms": "Terms",
  "settings.privacy": "Privacy",

  // Settings — Fun Mode
  "settings.funMode.title": "Fun Mode",
  "settings.funMode.hint":
    "Opt in to the bits of the site that exist purely for fun — deploy-banner SFX, mod pranks from /admin/abuse like the fake reboot. Real deploy warnings still show with Fun Mode off (you still need to save your work before the site restarts), they just do it silently and without the pranks.",
  "settings.funMode.off": "Off",
  "settings.funMode.on": "On",
  "settings.funMode.offHint": "Silent, no pranks.",
  "settings.funMode.onHint": "Sounds + pranks are on.",
  "settings.funMode.extremeTitle": "EXTREME FUN MODE.",
  "settings.funMode.extremeDescription":
    "Layered on top of Fun Mode. Every click spawns a hitmarker sprite and sound at your cursor (they can overlap on rapid clicks), and when the deploy-banner alarm hits zero a silent fullscreen nuke video plays for a few seconds before closing itself. Turning Fun Mode off cascades this back to off.",
  "settings.funMode.extremeLabelOn": "EXTREME FUN — ON",
  "settings.funMode.extremeLabelOff": "EXTREME FUN — OFF",
  "settings.funMode.extremeHintDisabled":
    "Turn Fun Mode on first — EXTREME needs Fun to be on.",
  "settings.funMode.extremeHintOn":
    "Clicks spawn a tilted hitmarker + sound (can overlap). The fake-reboot alarm now triggers a silent fullscreen nuke video. Turn it off if it gets annoying.",
  "settings.funMode.extremeHintOff":
    "Flip it on to arm click effects + the nuke video on the alarm.",

  // Error / 404 / fatal
  "error.title": "Something went wrong.",
  "error.body":
    "We hit an unexpected error loading this page. Please try again in a moment.",
  "error.retry": "Try again",
  "globalError.title": "Something went wrong.",
  "globalError.body":
    "A fatal error prevented the page from loading. Please try again.",
  "globalError.retry": "Try again",
  "notFound.eyebrow": "404",
  "notFound.title": "Nothing here.",
  "notFound.body":
    "The page or creation you were looking for isn't on the site.",
  "notFound.home": "Back to home",
  "notFound.search": "Search for a creation →",

  // Footer
  "footer.online": "{online} online",
  "footer.signedInTotal": "{total} signed-in users total",

  // /support
  "support.metadataTitle": "Support the site",
  "support.metadataDescription":
    "Concrete ways you can help keep the Scrap Mechanic Search Engine running and growing — from sharing links to flagging bugs.",
  "support.eyebrow": "Get involved",
  "support.heading": "How you can help",
  "support.intro":
    "The site runs on free tiers right now, which keeps it online but not self-growing — it stays useful because people like you pitch in. Here's everything that actually moves the needle.",
  "support.spreadHeading": "Spread the word",
  "support.spreadP1":
    "Most people hunting for Scrap Mechanic creations still dig through Steam's native Workshop browser. Telling a friend, posting a link in a Discord, or sharing a creation on Reddit is by far the single biggest thing you can do.",
  "support.spreadP2Before": "Every creation page now has a",
  "support.spreadP2ShareLabel": "Share",
  "support.spreadP2Between": "button next to",
  "support.spreadP2ViewLabel": "View on Steam Workshop",
  "support.spreadP2After": "— one click copies the link.",
  "support.spreadP3Before": "There's also a",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "— joining is free and members get announcements in their Steam client when new picks are posted.",
  "support.submitHeading": "Submit creations we've missed",
  "support.submitP1Before":
    "The auto-ingest only picks up trending items. Hidden gems that never went viral slip through. If you have one in mind — your own or someone else's — drop the Workshop URL at",
  "support.submitP1Link": "/submit",
  "support.submitP1After": ". A moderator reviews it and it goes live.",
  "support.voteHeading": "Vote and tag",
  "support.voteP1":
    "Every approved creation has up/down votes and a community tag system. The more people who vote on creations, the better the rating sorts work. If a creation is missing a tag you'd search for — add it. At +3 net votes, it becomes visible to everyone.",
  "support.reportHeading": "Report what's wrong",
  "support.reportP1Before": "Every creation page has a",
  "support.reportP1Label": "Report",
  "support.reportP1After":
    "button. Wrong tags, low quality, spam, missing co-authors — if something's off, flag it. A moderator handles it and the catalogue gets a little better.",
  "support.reportP2": "Individual comments can be reported too.",
  "support.suggestHeading": "Suggest features",
  "support.suggestP1Before":
    "Almost every meaningful improvement to the site came from a user idea. Drop yours on the",
  "support.suggestP1Link": "ideas board",
  "support.suggestP1After":
    "— it's a public, voted, triaged list, not a black hole.",
  "support.bugsHeading": "Flag bugs",
  "support.bugsP1Before":
    "Found something broken, ugly, or unclear? Post it on the ideas board with the bug tag or open an issue on",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": ". Verified bug reports earn the 🐛",
  "support.bugsP1BadgeLabel": "Bug hunter",
  "support.bugsP1BadgeAfter": "badge.",
  "support.moneyHeading": "Money support",
  "support.moneyP1":
    "Right now there's no way to donate — I haven't set up a Patreon, Ko-fi, or anything similar yet. But if the site grows, it'll eventually outgrow the free tiers, and at that point financial support would genuinely help keep it online and improving. If you'd like to contribute that way later, check back — I'll add a link here when something's set up.",
  "support.moneyP2":
    "In the meantime the items above are the most useful things you can do.",

  // /about
  "about.metadataTitle": "About · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "How the Scrap Mechanic Search Engine curates, ingests, and reviews Workshop creations.",
  "about.eyebrow": "How it works",
  "about.heading": "What is this site?",
  "about.shortVersion": "The short version",
  "about.shortVersionBody":
    "A hand-curated, searchable directory of Scrap Mechanic Steam Workshop creations. Quality is prioritised over quantity: every item on the public site has been through a human review step, and low-traction items are filtered before they ever reach that review.",
  "about.pipelineHeading": "The pipeline",
  "about.step1Heading": "1. Auto-ingest",
  "about.step1Body":
    "A daily cron fetches the newest Workshop entries via the Steam Web API. Items that fall below a per-kind follower and age threshold get filtered out — this keeps fresh zero-sub uploads and vote-farmable items out of the triage queue.",
  "about.step1TableHeading": "Minimum thresholds",
  "about.step1TableKind": "Kind",
  "about.step1TableMinSubs": "Min. subscribers",
  "about.step1TableMinAge": "Min. age",
  "about.step2Heading": "2. Human review",
  "about.step2Body":
    "Everything that passes the gate lands in a moderator triage queue. Moderators approve, reject, or ask for changes. Approved items get public tags and appear in the catalogue; rejected items stay out of future ingests.",
  "about.step3Heading": "3. Community submissions",
  "about.step3BodyBefore":
    "Anyone with a verified Steam account can manually suggest an item via",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    ". These bypass the follower/age filter but still go through the same moderator review — community submissions are flagged so mods can prioritise them.",
  "about.whatIfHeading": "What if my creation doesn't show up?",
  "about.whatIfBody":
    "If a creation isn't on the site, it's almost always because it's below the auto-ingest threshold and nobody has manually submitted it yet. Submit it at /submit — it takes ten seconds and a mod usually reviews within a day or two.",
  "about.costHeading": "Costs & sustainability",
  "about.costBody":
    "The whole stack runs on free tiers — Vercel Hobby for hosting, Neon Postgres for the database, Steam's public Web API for the data. No paid services, no ads, no trackers beyond basic server analytics. If you want to help keep it that way, see the /support page.",
  "about.thresholdsDays": "{n} days",

  "terms.metadataTitle": "Terms",
  "terms.metadataDescription":
    "Rules for using the site and posting content.",
  "terms.heading": "Terms of use",
  "terms.lastUpdated": "Last updated April 2026.",
  "terms.h2What": "What this site is",
  "terms.pWhat":
    "Scrap Mechanic Search Engine is a free, community-run directory that links to Steam Workshop creations for the game Scrap Mechanic. We are not affiliated with Axolot Games or Valve. Workshop items themselves are hosted on Steam; we only store metadata (title, description, tags, thumbnail URL) and link back.",
  "terms.h2Account": "Account",
  "terms.pAccount1":
    "Signing in uses Steam OpenID — we never see your Steam password. By signing in you agree to these terms and to our ",
  "terms.pAccountLink": "privacy policy",
  "terms.pAccount2":
    ". You are responsible for keeping your Steam account secure.",
  "terms.h2Rules": "Community rules",
  "terms.pRulesIntro":
    "When posting comments, tags, suggestions, or submissions:",
  "terms.liRulesDecent": "Be decent. No harassment, slurs, or threats.",
  "terms.liRulesSpam": "No spam, ads, or off-topic content.",
  "terms.liRulesAppid":
    "Only submit Workshop items for Scrap Mechanic (appid 387990). Submissions for other games are rejected automatically.",
  "terms.liRulesPii": "Don't post someone else's personal information.",
  "terms.liRulesExploit":
    "Don't try to break, brute-force, or exploit the site.",
  "terms.pRulesMods":
    "Moderators can hide content, warn, mute, or ban accounts that break these rules. Severe or repeated abuse may result in a permanent ban.",
  "terms.h2Content": "Your content",
  "terms.pContent":
    "Comments and suggestions you post stay credited to your persona name and may be kept in threaded form even after you leave, so ongoing discussions still make sense. You retain ownership of anything you write; by posting it you grant the site a non-exclusive right to display it to other users.",
  "terms.h2Takedowns": "Workshop content and takedowns",
  "terms.pTakedowns1":
    "The actual files and images for each Workshop item are hosted by Steam. If your Workshop item is listed here and you want it removed (e.g., you unpublished it on Steam), open an issue on the project's ",
  "terms.pTakedownsLink": "GitHub repository",
  "terms.pTakedowns2":
    " or contact a moderator and we'll take it down.",
  "terms.h2Warranty": "No warranty",
  "terms.pWarranty":
    "The site is provided as-is. Features can change or disappear, the site can go down, data can be wrong. Don't rely on it for anything important.",
  "terms.h2Changes": "Changes",
  "terms.pChanges":
    "We may update these terms. Material changes will be noted in the release notes. Continued use after a change means you accept the updated version.",

  "privacy.metadataTitle": "Privacy",
  "privacy.metadataDescription":
    "What we collect, why, and how long we keep it.",
  "privacy.h1": "Privacy",
  "privacy.lastUpdated": "Last updated April 2026.",
  "privacy.h2Short": "The short version",
  "privacy.pShort":
    "This is a community-run, non-commercial directory of Scrap Mechanic Workshop creations. We don't sell data, we don't run ads, we don't have an analytics tracker following you around. If you never sign in, we never see who you are.",
  "privacy.h2Store": "What we store",
  "privacy.pStoreIntro": "If you sign in with Steam, we save:",
  "privacy.liStoreId": "Your public SteamID, persona name, and avatar URL.",
  "privacy.liStoreAge":
    "Your Steam account age and Scrap Mechanic playtime — these come from Steam and are used to filter brand-new throwaway accounts.",
  "privacy.liStoreActivity":
    "The times you signed in, commented, voted, favourited, or submitted an item — so moderators can keep the site readable.",
  "privacy.pStoreNot":
    "We <strong>do not</strong> collect your email, password, phone number, real name, IP address, or browsing history.",
  "privacy.h2Cookies": "Cookies",
  "privacy.liCookieSession":
    "<code>smse_session</code> — signed-in session, expires after a week of inactivity.",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code> — short-lived (30 min) state for the anti-bot challenge.",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code> — set after you pass the challenge, lasts 30 days.",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code> — remembers whether you prefer Steam ratings, site ratings, or both.",
  "privacy.liCookieTheme":
    "<code>smse_theme</code> — remembers your chosen colour theme.",
  "privacy.pCookieFooter":
    "All cookies are first-party, signed / HTTP-only where it matters. No advertising trackers.",
  "privacy.h2Where": "Where the data lives",
  "privacy.liWhereDb": "Database: Neon (serverless Postgres, free tier).",
  "privacy.liWhereHost": "Hosting: Vercel.",
  "privacy.liWhereSteam": "Workshop metadata & thumbnails: Steam (hotlinked).",
  "privacy.pWhereLogs":
    "Vercel and Neon may keep ephemeral operational logs. We don't put personal data in log messages beyond what's needed to fix bugs.",
  "privacy.h2Controls": "Your controls",
  "privacy.liControlsStop":
    "Stop using the site any time — logged-out visitors leave no identifying data.",
  "privacy.liControlsDeletePre":
    "Ask for deletion of your account data by opening an issue on the project's ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    ". Content you posted (comments, suggestions) may be anonymised rather than deleted to keep discussion threads readable.",
  "privacy.h2Changes": "Changes",
  "privacy.pChanges":
    "If this policy meaningfully changes, the update will be announced in the site's release notes. This page will always show the latest version.",

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
  "nav.reviews": "Обзоры игр",
  "nav.submit": "Добавить",
  "nav.signIn": "Войти через Steam",
  "nav.settings": "Настройки",
  "nav.minigames": "Мини-игры и прочее",
  "nav.adminTriage": "Админ",
  "nav.about": "О сайте",
  "nav.guide": "Как пользоваться сайтом",
  "nav.support": "Поддержать сайт",
  "nav.favourites": "Ваши избранные",
  "nav.notifications": "Уведомления",
  "nav.submissions": "Ваши заявки",

  "kind.blueprints": "Чертежи",
  "kind.mods": "Моды",
  "kind.worlds": "Миры",
  "kind.challenges": "Испытания",
  "kind.tiles": "Тайлы",
  "kind.customGames": "Кастомные игры",
  "kind.terrain": "Рельеф",
  "kind.other": "Прочее",

  "kind.blueprint": "Чертёж",
  "kind.mod": "Мод",
  "kind.world": "Мир",
  "kind.challenge": "Испытание",
  "kind.tile": "Тайл",
  "kind.customGame": "Кастомная игра",
  "kind.terrainAsset": "Рельеф",
  "kind.creationFallback": "Объект",

  "rss.title": "Scrap Mechanic Search Engine — Новое",
  "rss.description":
    "Самые свежие одобренные объекты из Мастерской Scrap Mechanic на Scrap Mechanic Search Engine.",
  "rss.by": "автор:",

  "submit.metadataTitle": "Предложить объект — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "Предложите объект из Мастерской Scrap Mechanic, который ещё не нашёл крон. Одобренные объекты появляются в публичной ленте с бейджем «Community», отмечающим ваш вклад.",
  "submit.introBefore":
    "Нашли что-то стоящее, чего ещё нет в каталоге? Отправьте любую ссылку или ID из Мастерской Steam — модератор проверит, и объект появится в публичной ленте с бейджем",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "отмечающим ваш вклад.",
  "submit.privateProfileTitle":
    "Мы не смогли проверить возраст вашего аккаунта Steam.",
  "submit.privateProfileBody":
    "Ваш профиль Steam закрыт, поэтому дата создания скрыта. Сделайте профиль публичным и войдите ещё раз — или отправьте модератору апелляцию, и он откроет ограничение вручную.",
  "submit.privateProfileAppeal": "Подать апелляцию →",
  "submit.tooYoungTitle": "Вашему аккаунту Steam меньше 7 дней.",
  "submit.tooYoungBody":
    "Это жёсткий таймер, чтобы новые фейковые аккаунты не спамили сайт. Это не то, что модератор может обойти в случае «слишком свежего» аккаунта — просто придётся подождать.",
  "submit.tooYoungBodyStrong": "не то, что модератор может обойти",
  "submit.tooYoungClearsOn":
    "Ограничение снимется {date}. Возвращайтесь тогда.",
  "submit.acceptedForms": "Поддерживаемые форматы",
  "submit.queueExplain":
    "Заявки попадают в очередь модерации. Они появляются публично после одобрения; крон не будет пытаться повторно их обработать.",
  "submit.curious": "Интересно, что попадает и почему?",
  "submit.howItWorks": "Как это работает",
  "submit.form.urlLabel": "Ссылка на Мастерскую Steam или ID published-file",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "Отправляем…",
  "submit.form.submitButton": "Отправить на рассмотрение",
  "submit.form.successToast":
    "Отправлено — модератор вскоре проверит.",
  "submit.form.errorToast":
    "Не удалось отправить. Попробуйте снова или проверьте ссылку.",
  "submit.form.queuedToast": "{title} в очереди на модерацию.",
  "submit.form.pendingBefore": "Спасибо —",
  "submit.form.pendingAfter": "ожидает проверки модератором.",
  "submit.form.backHome": "На главную ↗",

  "home.heroTitle": "Найдите лучшее из Мастерской.",
  "home.newestHeading": "Последние добавления",
  "home.browseHeading": "Смотреть каталог",
  "home.viewAll": "Смотреть всё →",
  "compare.heading": "Сравнить",
  "compare.subheading": "Сравнение {count} творений",
  "compare.field": "Поле",
  "compare.fieldKind": "Тип",
  "compare.fieldAuthor": "Автор",
  "compare.fieldSubs": "Подписчики",
  "compare.fieldFavorites": "Избранное",
  "compare.fieldRating": "Рейтинг",
  "compare.fieldSiteNet": "Голоса сайта (нетто)",
  "compare.fieldOnSteam": "Создано в Steam",
  "compare.fieldOnSite": "Одобрено на сайте",
  "compare.fieldTags": "Теги",
  "compare.fieldLinks": "Ссылки",
  "compare.openOnSite": "Открыть ↗",
  "compare.add": "Сравнить",
  "compare.inBasket": "В корзине",
  "compare.added": "Добавлено в корзину сравнения",
  "compare.removed": "Удалено из корзины сравнения",
  "compare.replacedOldest": "Корзина заполнена — заменили самое старое",
  "compare.addAria": "Добавить это творение в корзину сравнения",
  "compare.removeAria": "Убрать это творение из корзины сравнения",
  "compare.basketLabel": "{count} в корзине",
  "compare.basketHint": "Добавьте ещё одно",
  "compare.openButton": "Сравнить →",
  "compare.clearAria": "Очистить корзину сравнения",
  "compare.emptyHelp": "Добавьте минимум 2 творения в корзину сравнения с любой страницы творения.",
  "compare.needTwo": "Добавьте ещё одно творение для сравнения.",
  "compare.browseLink": "Смотреть творения",
  "home.surpriseMe": "Удиви меня",
  "home.surpriseMeHint": "Перейти к случайной работе",
  "author.totalCreations": "Творений",
  "author.totalSubs": "Всего подписчиков",
  "author.kindBreakdown": "По типу",
  "author.topCreation": "Лучшее творение",
  "rss.titleByAuthor": "Новые от {name}",
  "rss.descriptionByAuthor": "Новейшие одобренные работы Scrap Mechanic от {name}.",
  "rss.titleByTag": "Новые с тегом #{tag}",
  "rss.descriptionByTag": "Новейшие одобренные работы Scrap Mechanic с тегом #{tag}.",
  "home.forYouHeading": "Для тебя",
  "home.forYouHint": "Подобрано из ваших избранных и оценок",
  "home.trendingHeading": "В тренде",
  "home.trendingHint": "Лучшее на сайте",
  "profile.recentComments": "Недавние комментарии",
  "profile.commentOnWall": "на стене {name}",
  "profile.commentDeleted": "[удалено]",
  "profile.commentDeletedTarget": "[цель удалена]",
  "home.noItems": "Пока нет одобренных объектов.",
  "home.supportCalloutBefore":
    "Хотите помочь проекту развиваться? Загляните на",
  "home.supportCalloutLink": "Поддержать сайт",
  "home.supportCalloutAfter":
    "— там конкретные способы внести вклад.",
  "home.descriptionBefore":
    "Вручную отобранные Чертежи, Моды, Миры и другое. Комбинируйте теги, например",
  "home.descriptionExample1": "дом + машина",
  "home.descriptionBetween":
    "— чтобы найти жилой фургон, или",
  "home.descriptionExample2": "шагоход + мех",
  "home.descriptionAfter":
    "— для гексапода. Низкокачественные творения отсеиваются.",
  "home.indexedOne": "{count} объект в каталоге",
  "home.indexedMany": "{count} объектов в каталоге",
  "home.emptyState":
    "Пока нет одобренных объектов. Запустите сбор и проверьте очередь.",
  "home.popularBlueprints": "Популярные чертежи",
  "home.popularMods": "Популярные моды",
  "home.popularWorlds": "Популярные миры",
  "home.popularChallenges": "Популярные испытания",

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

  "newest.title": "Последние добавления",
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
  "creators.filterAll": "Все виды",
  "creators.filterAria": "Фильтр авторов по виду",

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

  "minigames.eyebrow": "Комната отдыха",
  "minigames.title": "Мини-игры и прочее",
  "minigames.subtitle":
    "Небольшие развлечения по Scrap Mechanic и ещё пара странностей прямо на сайте. Новые будут появляться по мере готовности.",
  "minigames.playLabel": "Играть",
  "minigames.othersLabel": "Прочее",
  "minigames.gamesHeading": "Игры",
  "minigames.othersHeading": "Прочее",
  "minigames.comingSoon": "Скоро ещё",
  "minigames.backToIndex": "← К мини-играм",
  "minigames.reset": "Сбросить",
  "minigames.statsLabel": "Статистика сессии",
  "minigames.stat.streak": "Серия",
  "minigames.stat.bestStreak": "Рекорд",
  "minigames.stat.rounds": "Раунды",
  "minigames.stat.accuracy": "Точность",
  "minigames.whoIsThis": "Кто это?",
  "minigames.zoomAria": "Нажмите, чтобы увеличить",
  "minigames.zoomHint": "Увеличить",
  "minigames.zoomDialogLabel": "Увеличенное изображение персонажа",
  "minigames.wrongReset": "Неверно — серия сброшена.",
  "minigames.roundWon": "Раунд пройден! Следующий…",
  "minigames.scrapcha.name": "Скрапча",
  "minigames.scrapcha.blurb":
    "Угадывайте персонажей Scrap Mechanic по скриншотам. Та же задачка, что и на входе, но бесконечная — насколько длинную серию вы удержите?",
  "minigames.scrapcha.subtitle":
    "Выберите персонажа на скриншоте. Одна ошибка — и серия сброшена. Как далеко вы зайдёте?",
  "minigames.blockdle.name": "Блокдл",
  "minigames.blockdle.blurb":
    "Почти невыполнимый угадайщик блоков Scrap Mechanic. Девять подсказок, десять попыток, 500+ блоков.",
  "minigames.blockdle.subtitle":
    "Угадайте блок. Характеристики подсказывают, насколько вы близки — зелёный значит совпадение, стрелки указывают направление.",
  "minigames.blockdle.mode.daily": "Ежедневно",
  "minigames.blockdle.mode.endless": "Бесконечно",
  "minigames.blockdle.inputPlaceholder": "Введите название блока…",
  "minigames.blockdle.submit": "Угадать",
  "minigames.blockdle.attemptsRemaining": "Осталось {n}",
  "minigames.blockdle.col.icon": "Иконка",
  "minigames.blockdle.col.name": "Название",
  "minigames.blockdle.col.inventoryType": "Тип",
  "minigames.blockdle.col.category": "Категория",
  "minigames.blockdle.col.material": "Материал",
  "minigames.blockdle.col.flammable": "Горючий",
  "minigames.blockdle.col.level": "Уровень",
  "minigames.blockdle.col.durability": "Прочн.",
  "minigames.blockdle.col.density": "Плотн.",
  "minigames.blockdle.col.friction": "Трение",
  "minigames.blockdle.col.buoyancy": "Плавуч.",
  "minigames.blockdle.flammable.yes": "Да",
  "minigames.blockdle.flammable.no": "Нет",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "Таблица лидеров",
  "minigames.blockdle.leaderboard.subtitle": "Победители с аккаунтом, от меньшего числа попыток. Сброс каждую полночь UTC.",
  "minigames.blockdle.leaderboard.count": "{n} завершили",
  "minigames.blockdle.leaderboard.empty": "Сегодня ещё никто не решил — будьте первым!",
  "minigames.blockdle.leaderboard.guesses": "{n} попыток",
  "minigames.blockdle.leaderboard.allTimeTitle": "Чемпионы за всё время",
  "minigames.blockdle.leaderboard.allTimeSubtitle": "Все, кто когда-либо прошёл дневную загадку. Сортировка по победам, при равенстве — по среднему числу попыток.",
  "minigames.blockdle.leaderboard.allTimeEmpty": "Пока никто не прошёл ни одной дневной загадки.",
  "minigames.blockdle.leaderboard.wins": "{n} побед",
  "minigames.blockdle.leaderboard.avg": "в среднем {n}",
  "minigames.blockdle.win.title": "Угадано!",
  "minigames.blockdle.win.body": "За {n}/{max} попыток.",
  "minigames.blockdle.lose.title": "Попытки закончились",
  "minigames.blockdle.lose.body": "Это был {name}.",
  "minigames.blockdle.reveal.label": "Ответ",
  "minigames.blockdle.share.button": "Поделиться",
  "minigames.blockdle.share.copied": "Скопировано",
  "minigames.blockdle.daily.cta.endless": "Играть бесконечно →",
  "minigames.blockdle.daily.cta.tomorrow": "Возвращайтесь завтра за новым блоком",
  "minigames.blockdle.endless.cta.next": "Следующий блок →",
  "minigames.blockdle.error.unknownBlock": "Такого блока мы не знаем.",
  "minigames.blockdle.error.duplicate": "Уже угадывали.",
  "minigames.blockdle.stat.wins": "Побед",
  "minigames.blockdle.stat.losses": "Поражений",

  "minigames.silence.name": "Тишина Scrap Mechanic",
  "minigames.silence.blurb":
    "Сколько прошло с тех пор, как Axolot что-то опубликовали в ленте новостей Steam? Таймер идёт.",
  "minigames.silence.title": "Сколько прошло с последней новости о Scrap Mechanic",
  "minigames.silence.subtitle":
    "Живой счётчик читает официальную ленту новостей Steam для Scrap Mechanic (appid 387990). Патч, анонс, заметка разработчика — что бы ни появилось, таймер сбрасывается.",
  "minigames.silence.months": "Месяцев",
  "minigames.silence.days": "Дней",
  "minigames.silence.hours": "Часов",
  "minigames.silence.minutes": "Минут",
  "minigames.silence.seconds": "Секунд",
  "minigames.silence.totalSeconds": "Всего {n} секунд.",
  "minigames.silence.lastNewsLabel": "Последняя новость",
  "minigames.silence.disclaimer":
    "«Месяц» здесь — это условные 30 дней, вайб важнее календаря. Данные обновляются на сервере раз в 10 минут.",
  "minigames.silence.error":
    "Сейчас не удалось получить ленту новостей Steam. Попробуйте через несколько минут.",

  "creation.backToNewest": "← К новым",
  "creation.by": "от",
  "creation.viewOnSteamWorkshop": "Открыть в Мастерской Steam ↗",
  "creation.share": "Поделиться",
  "creation.shareAria": "Скопировать ссылку на эту работу",
  "creation.shareCopied": "Ссылка скопирована в буфер обмена.",
  "creation.shareCopiedShort": "Скопировано",
  "creation.shareFailed": "Не удалось скопировать ссылку.",
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
  "settings.quickGuide": "Краткий гайд →",
  "settings.ideasBoardLink": "Доска идей →",
  "settings.supportLink": "Поддержать сайт →",
  "settings.terms": "Условия",
  "settings.privacy": "Конфиденциальность",

  "settings.funMode.title": "Весёлый режим",
  "settings.funMode.hint":
    "Включите разделы сайта, которые существуют исключительно ради веселья — звуки баннера развёртывания, модераторские шутки из /admin/abuse вроде фейковой перезагрузки. Настоящие предупреждения о развёртывании всё равно показываются, если режим выключен (вам всё же нужно сохранить работу перед перезапуском сайта), просто без звука и без шуток.",
  "settings.funMode.off": "Выкл.",
  "settings.funMode.on": "Вкл.",
  "settings.funMode.offHint": "Без звука, без шуток.",
  "settings.funMode.onHint": "Звуки и шутки включены.",
  "settings.funMode.extremeTitle": "ЭКСТРЕМАЛЬНЫЙ ВЕСЁЛЫЙ РЕЖИМ.",
  "settings.funMode.extremeDescription":
    "Надстройка поверх Весёлого режима. Каждый клик порождает спрайт-хитмаркер и звук у курсора (быстрые клики могут накладываться), а когда сигнал баннера развёртывания достигает нуля — на весь экран беззвучно воспроизводится видео ядерного взрыва, которое закрывается само по окончании. Выключение Весёлого режима автоматически выключает и этот.",
  "settings.funMode.extremeLabelOn": "ЭКСТРЕМАЛЬНОЕ ВЕСЕЛЬЕ — ВКЛ.",
  "settings.funMode.extremeLabelOff": "ЭКСТРЕМАЛЬНОЕ ВЕСЕЛЬЕ — ВЫКЛ.",
  "settings.funMode.extremeHintDisabled":
    "Сначала включите Весёлый режим — ЭКСТРЕМАЛЬНОМУ нужен базовый.",
  "settings.funMode.extremeHintOn":
    "Клики порождают наклонённый хитмаркер и звук (могут накладываться). Сигнал фейковой перезагрузки теперь запускает беззвучное полноэкранное видео ядерного взрыва. Выключите, если надоест.",
  "settings.funMode.extremeHintOff":
    "Включите, чтобы активировать эффекты кликов и видео ядерного взрыва на сигнал тревоги.",

  "error.title": "Что-то пошло не так.",
  "error.body":
    "Произошла непредвиденная ошибка при загрузке страницы. Попробуйте ещё раз через минуту.",
  "error.retry": "Повторить",
  "globalError.title": "Что-то пошло не так.",
  "globalError.body":
    "Критическая ошибка не позволила загрузить страницу. Попробуйте ещё раз.",
  "globalError.retry": "Повторить",
  "notFound.eyebrow": "404",
  "notFound.title": "Здесь ничего нет.",
  "notFound.body":
    "Страница или объект, который вы искали, на сайте отсутствует.",
  "notFound.home": "Вернуться на главную",
  "notFound.search": "Искать объекты →",

  "footer.online": "{online} онлайн",
  "footer.signedInTotal": "всего {total} зарегистрированных",

  "support.metadataTitle": "Поддержать сайт",
  "support.metadataDescription":
    "Конкретные способы помочь Scrap Mechanic Search Engine работать и развиваться — от репостов ссылок до сообщений об ошибках.",
  "support.eyebrow": "Присоединяйтесь",
  "support.heading": "Как вы можете помочь",
  "support.intro":
    "Сейчас сайт работает на бесплатных тарифах — этого хватает, чтобы он был онлайн, но не чтобы он рос сам по себе. Он остаётся полезным благодаря таким людям, как вы. Вот всё, что реально имеет значение.",
  "support.spreadHeading": "Расскажите другим",
  "support.spreadP1":
    "Большинство людей, ищущих творения для Scrap Mechanic, до сих пор копаются во встроенном браузере Мастерской Steam. Рассказать другу, кинуть ссылку в Discord или поделиться творением на Reddit — это безусловно самое важное, что вы можете сделать.",
  "support.spreadP2Before": "На странице каждого творения теперь есть кнопка",
  "support.spreadP2ShareLabel": "Поделиться",
  "support.spreadP2Between": "рядом с",
  "support.spreadP2ViewLabel": "Открыть в Steam Workshop",
  "support.spreadP2After": "— один клик копирует ссылку.",
  "support.spreadP3Before": "Ещё есть",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "— вступление бесплатное, а участники получают уведомления в клиенте Steam, когда появляются новые подборки.",
  "support.submitHeading": "Присылайте пропущенные творения",
  "support.submitP1Before":
    "Автоматический сбор подхватывает только трендовые работы. Скрытые жемчужины, которые так и не стали вирусными, проскакивают мимо. Если у вас есть такая на примете — своя или чужая — киньте ссылку на Мастерскую на",
  "support.submitP1Link": "/submit",
  "support.submitP1After": ". Модератор проверит её, и она появится на сайте.",
  "support.voteHeading": "Голосуйте и ставьте теги",
  "support.voteP1":
    "У каждого одобренного творения есть голоса «за»/«против» и система пользовательских тегов. Чем больше людей голосует за творения, тем лучше работает сортировка по рейтингу. Если у творения не хватает тега, по которому вы бы его искали — добавьте его. При +3 чистых голосах тег становится виден всем.",
  "support.reportHeading": "Сообщайте о проблемах",
  "support.reportP1Before": "На странице каждого творения есть кнопка",
  "support.reportP1Label": "Пожаловаться",
  "support.reportP1After":
    ". Неправильные теги, низкое качество, спам, неуказанные соавторы — если что-то не так, отметьте это. Модератор разберётся, и каталог станет чуть лучше.",
  "support.reportP2": "Отдельные комментарии тоже можно отправить на рассмотрение.",
  "support.suggestHeading": "Предлагайте идеи",
  "support.suggestP1Before":
    "Почти каждое значимое улучшение сайта пришло от пользователя. Оставляйте свои на",
  "support.suggestP1Link": "доске идей",
  "support.suggestP1After":
    "— это публичный список с голосованием и разбором, а не чёрная дыра.",
  "support.bugsHeading": "Сообщайте об ошибках",
  "support.bugsP1Before":
    "Нашли что-то сломанное, уродливое или непонятное? Напишите на доску идей с тегом bug или откройте issue на",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": ". За подтверждённые баг-репорты даётся 🐛 значок",
  "support.bugsP1BadgeLabel": "Охотник за багами",
  "support.bugsP1BadgeAfter": ".",
  "support.moneyHeading": "Финансовая поддержка",
  "support.moneyP1":
    "Пока что пожертвований нет — я ещё не завёл ни Patreon, ни Ko-fi, ни чего-либо подобного. Но если сайт вырастет, он рано или поздно упрётся в лимиты бесплатных тарифов, и тогда финансовая поддержка действительно поможет держать его онлайн и развивать. Если захотите поддержать проект позже — заглядывайте сюда, я добавлю ссылку, когда всё настрою.",
  "support.moneyP2":
    "А пока перечисленное выше — самое полезное, что вы можете сделать.",

  "about.metadataTitle": "О проекте · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "Как Scrap Mechanic Search Engine отбирает, загружает и проверяет творения из Мастерской.",
  "about.eyebrow": "Как это работает",
  "about.heading": "Что это за сайт?",
  "about.shortVersion": "Если коротко",
  "about.shortVersionBody":
    "Вручную отобранный поисковый каталог творений из Мастерской Steam для Scrap Mechanic. Качество важнее количества: каждая позиция на публичном сайте прошла проверку модератором, а материалы с низким интересом отсеиваются ещё до этой проверки.",
  "about.pipelineHeading": "Конвейер",
  "about.step1Heading": "1. Автоматическая загрузка",
  "about.step1Body":
    "Ежедневный cron получает новейшие записи из Мастерской через Steam Web API. Позиции, не дотягивающие до порога подписчиков и возраста для своего типа, отсеиваются — это не даёт свежим загрузкам без подписчиков и материалам с накрученными голосами попасть в очередь модерации.",
  "about.step1TableHeading": "Минимальные пороги",
  "about.step1TableKind": "Тип",
  "about.step1TableMinSubs": "Мин. подписчиков",
  "about.step1TableMinAge": "Мин. возраст",
  "about.step2Heading": "2. Проверка человеком",
  "about.step2Body":
    "Всё, что прошло фильтр, попадает в очередь модерации. Модераторы одобряют, отклоняют или запрашивают изменения. Одобренные позиции получают публичные теги и появляются в каталоге; отклонённые больше не попадают в будущие загрузки.",
  "about.step3Heading": "3. Заявки от сообщества",
  "about.step3BodyBefore":
    "Любой пользователь с подтверждённым аккаунтом Steam может вручную предложить материал через",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    ". Такие заявки обходят фильтр по подписчикам и возрасту, но проходят ту же модерацию — они помечаются, чтобы модераторы могли отдать им приоритет.",
  "about.whatIfHeading": "Что если моего творения нет на сайте?",
  "about.whatIfBody":
    "Если творения нет на сайте, почти всегда это потому, что оно ниже порога автоматической загрузки и его ещё никто не предложил вручную. Отправьте его через /submit — это занимает десять секунд, и модератор обычно рассматривает заявку за день-два.",
  "about.costHeading": "Расходы и устойчивость",
  "about.costBody":
    "Весь стек работает на бесплатных тарифах — Vercel Hobby для хостинга, Neon Postgres для базы данных, публичный Steam Web API для данных. Никаких платных сервисов, рекламы и трекеров, кроме базовой серверной аналитики. Если вы хотите помочь сохранить это, загляните на страницу /support.",
  "about.thresholdsDays": "{n} дн.",

  "terms.metadataTitle": "Условия",
  "terms.metadataDescription":
    "Правила использования сайта и публикации материалов.",
  "terms.heading": "Условия использования",
  "terms.lastUpdated": "Последнее обновление — апрель 2026 г.",
  "terms.h2What": "Что это за сайт",
  "terms.pWhat":
    "Scrap Mechanic Search Engine — это бесплатный каталог, который ведёт сообщество и в котором собраны ссылки на творения Steam Workshop для игры Scrap Mechanic. Мы не связаны с Axolot Games или Valve. Сами файлы Workshop хранятся в Steam; мы храним только метаданные (название, описание, теги, URL миниатюры) и ссылки на оригинал.",
  "terms.h2Account": "Аккаунт",
  "terms.pAccount1":
    "Для входа используется Steam OpenID — мы никогда не видим ваш пароль Steam. Входя на сайт, вы соглашаетесь с настоящими условиями и нашей ",
  "terms.pAccountLink": "политикой конфиденциальности",
  "terms.pAccount2":
    ". Вы несёте ответственность за безопасность своего аккаунта Steam.",
  "terms.h2Rules": "Правила сообщества",
  "terms.pRulesIntro":
    "При публикации комментариев, тегов, предложений или материалов:",
  "terms.liRulesDecent": "Ведите себя достойно. Никаких оскорблений, травли или угроз.",
  "terms.liRulesSpam": "Никакого спама, рекламы или офтопика.",
  "terms.liRulesAppid":
    "Отправляйте только творения Workshop для Scrap Mechanic (appid 387990). Заявки на другие игры отклоняются автоматически.",
  "terms.liRulesPii": "Не публикуйте личную информацию других людей.",
  "terms.liRulesExploit":
    "Не пытайтесь сломать, взломать перебором или использовать уязвимости сайта.",
  "terms.pRulesMods":
    "Модераторы могут скрывать материалы, выносить предупреждения, отключать доступ к чату или блокировать аккаунты, нарушающие эти правила. За грубые или систематические нарушения может быть назначена бессрочная блокировка.",
  "terms.h2Content": "Ваш контент",
  "terms.pContent":
    "Комментарии и предложения, которые вы публикуете, остаются подписанными вашим persona-именем и могут сохраняться в виде цепочек обсуждений даже после того, как вы покинете сайт, чтобы ранее начатые дискуссии оставались понятными. Все права на написанное сохраняются за вами; публикуя материал, вы предоставляете сайту неисключительное право отображать его другим пользователям.",
  "terms.h2Takedowns": "Контент Workshop и запросы на удаление",
  "terms.pTakedowns1":
    "Сами файлы и изображения каждого творения Workshop размещены в Steam. Если ваше творение Workshop указано здесь и вы хотите его удалить (например, вы сняли его с публикации в Steam), откройте issue в ",
  "terms.pTakedownsLink": "репозитории GitHub",
  "terms.pTakedowns2":
    " проекта или обратитесь к модератору, и мы его уберём.",
  "terms.h2Warranty": "Отсутствие гарантий",
  "terms.pWarranty":
    "Сайт предоставляется «как есть». Функции могут меняться или исчезать, сайт может быть недоступен, данные могут содержать ошибки. Не полагайтесь на него в важных вопросах.",
  "terms.h2Changes": "Изменения",
  "terms.pChanges":
    "Мы можем обновлять настоящие условия. О существенных изменениях будет сообщено в примечаниях к выпускам. Продолжение использования сайта после изменений означает согласие с обновлённой версией.",

  "privacy.metadataTitle": "Конфиденциальность",
  "privacy.metadataDescription":
    "Что мы собираем, зачем и как долго храним.",
  "privacy.h1": "Конфиденциальность",
  "privacy.lastUpdated": "Последнее обновление: апрель 2026 года.",
  "privacy.h2Short": "Кратко",
  "privacy.pShort":
    "Это некоммерческий каталог творений Scrap Mechanic Workshop, управляемый сообществом. Мы не продаём данные, не показываем рекламу и не используем трекеры аналитики, которые следят за вами. Если вы не войдёте в систему, мы никогда не узнаем, кто вы.",
  "privacy.h2Store": "Что мы храним",
  "privacy.pStoreIntro": "Если вы входите через Steam, мы сохраняем:",
  "privacy.liStoreId": "Ваш публичный SteamID, имя профиля и URL аватара.",
  "privacy.liStoreAge":
    "Возраст вашей учётной записи Steam и время, проведённое в Scrap Mechanic, — эти данные поступают из Steam и используются для отсеивания одноразовых аккаунтов, созданных только что.",
  "privacy.liStoreActivity":
    "Время, когда вы входили в систему, оставляли комментарии, голосовали, добавляли в избранное или отправляли материалы, — чтобы модераторы могли поддерживать читаемость сайта.",
  "privacy.pStoreNot":
    "Мы <strong>не</strong> собираем вашу электронную почту, пароль, номер телефона, настоящее имя, IP-адрес или историю посещений.",
  "privacy.h2Cookies": "Cookie-файлы",
  "privacy.liCookieSession":
    "<code>smse_session</code> — сессия входа, истекает после недели бездействия.",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code> — кратковременное состояние (30 мин) для проверки на бота.",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code> — устанавливается после прохождения проверки, действует 30 дней.",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code> — запоминает, какие оценки вы предпочитаете: Steam, сайта или и те, и другие.",
  "privacy.liCookieTheme":
    "<code>smse_theme</code> — запоминает выбранную вами цветовую тему.",
  "privacy.pCookieFooter":
    "Все cookie-файлы являются первичными, подписаны и используют HTTP-only там, где это важно. Никаких рекламных трекеров.",
  "privacy.h2Where": "Где хранятся данные",
  "privacy.liWhereDb": "База данных: Neon (бессерверный Postgres, бесплатный тариф).",
  "privacy.liWhereHost": "Хостинг: Vercel.",
  "privacy.liWhereSteam": "Метаданные и миниатюры Workshop: Steam (прямые ссылки).",
  "privacy.pWhereLogs":
    "Vercel и Neon могут вести краткосрочные операционные журналы. Мы не включаем в журналы персональные данные сверх того, что необходимо для исправления ошибок.",
  "privacy.h2Controls": "Ваши возможности управления",
  "privacy.liControlsStop":
    "Прекратите использовать сайт в любое время — посетители без входа не оставляют идентифицирующих данных.",
  "privacy.liControlsDeletePre":
    "Запросите удаление данных вашей учётной записи, открыв issue в ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    " проекта. Ваш размещённый контент (комментарии, предложения) может быть анонимизирован, а не удалён, чтобы сохранить читаемость обсуждений.",
  "privacy.h2Changes": "Изменения",
  "privacy.pChanges":
    "Если эта политика существенно изменится, обновление будет объявлено в примечаниях к выпуску на сайте. Данная страница всегда показывает актуальную версию.",

  "locale.picker.label": "Язык",
};

const de: Dictionary = {
  "nav.newest": "Neueste",
  "nav.browse": "Stöbern",
  "nav.search": "Suche",
  "nav.creators": "Ersteller",
  "nav.ideas": "Ideen",
  "nav.whatsNew": "Neuigkeiten",
  "nav.reviews": "Spielbewertungen",
  "nav.submit": "Einreichen",
  "nav.signIn": "Mit Steam anmelden",
  "nav.settings": "Einstellungen",
  "nav.minigames": "Minispiele & mehr",
  "nav.adminTriage": "Admin triage",
  "nav.about": "Über die Seite",
  "nav.guide": "So benutzt du die Seite",
  "nav.support": "Die Seite unterstützen",
  "nav.favourites": "Deine Favoriten",
  "nav.notifications": "Benachrichtigungen",
  "nav.submissions": "Deine Einreichungen",

  "kind.blueprints": "Blaupausen",
  "kind.mods": "Mods",
  "kind.worlds": "Welten",
  "kind.challenges": "Challenges",
  "kind.tiles": "Tiles",
  "kind.customGames": "Custom Games",
  "kind.terrain": "Gelände",
  "kind.other": "Sonstiges",

  "kind.blueprint": "Blaupause",
  "kind.mod": "Mod",
  "kind.world": "Welt",
  "kind.challenge": "Challenge",
  "kind.tile": "Tile",
  "kind.customGame": "Custom Game",
  "kind.terrainAsset": "Gelände",
  "kind.creationFallback": "Kreation",

  "rss.title": "Scrap Mechanic Search Engine — Neueste",
  "rss.description":
    "Die neuesten freigegebenen Scrap-Mechanic-Steam-Workshop-Kreationen auf der Scrap Mechanic Search Engine.",
  "rss.by": "von",

  "submit.metadataTitle": "Kreation einreichen — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "Reiche eine Scrap-Mechanic-Steam-Workshop-Kreation ein, die der Cron noch nicht gefunden hat. Freigegebene Einträge erscheinen im öffentlichen Feed mit einem Community-Badge, der dich auszeichnet.",
  "submit.introBefore":
    "Eine Perle, die der Cron noch nicht gefunden hat? Reiche eine beliebige Steam-Workshop-URL oder -ID ein — ein Moderator prüft es und es landet mit einem",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "Badge, der dich auszeichnet, im öffentlichen Feed.",
  "submit.privateProfileTitle":
    "Wir konnten das Alter deines Steam-Kontos nicht überprüfen.",
  "submit.privateProfileBody":
    "Dein Steam-Profil ist privat, daher ist das Erstellungsdatum verborgen. Stelle dein Profil öffentlich und melde dich erneut an — oder sende einem Moderator einen kurzen Einspruch, dann schaltet er dein Konto manuell frei.",
  "submit.privateProfileAppeal": "Alters-Gate-Einspruch →",
  "submit.tooYoungTitle": "Dein Steam-Konto ist weniger als 7 Tage alt.",
  "submit.tooYoungBody":
    "Das ist ein fest eingebauter Cooldown, damit frische Sock-Puppet-Konten die Seite nicht spammen. Das kann ein Moderator im Fall „zu frisch“ nicht umgehen — du musst einfach warten.",
  "submit.tooYoungBodyStrong": "kann ein Moderator nicht umgehen",
  "submit.tooYoungClearsOn":
    "Dein Konto passiert das Gate am {date}. Komm dann wieder.",
  "submit.acceptedForms": "Akzeptierte Formen",
  "submit.queueExplain":
    "Eingereichte Einträge landen in der Moderator-Triage-Warteschlange. Sie erscheinen öffentlich erst nach Freigabe; der Cron versucht nicht, sie erneut einzuholen.",
  "submit.curious": "Neugierig, was reinkommt und warum?",
  "submit.howItWorks": "Wie es funktioniert",
  "submit.form.urlLabel": "Steam-Workshop-URL oder Published-File-ID",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "Wird gesendet…",
  "submit.form.submitButton": "Zur Prüfung einreichen",
  "submit.form.successToast":
    "Eingereicht — ein Moderator schaut es sich bald an.",
  "submit.form.errorToast":
    "Einreichung fehlgeschlagen. Versuche es erneut oder prüfe die URL.",
  "submit.form.queuedToast": "{title} in der Mod-Warteschlange.",
  "submit.form.pendingBefore": "Danke —",
  "submit.form.pendingAfter": "wartet jetzt auf die Mod-Prüfung.",
  "submit.form.backHome": "Zurück zur Startseite ↗",

  "home.heroTitle": "Finde das Gute aus dem Workshop.",
  "home.supportCalloutBefore":
    "Willst du, dass dieses Projekt weiter wächst? Schau auf",
  "home.supportCalloutLink": "Die Seite unterstützen",
  "home.supportCalloutAfter":
    ", um konkrete Wege zu sehen, wie du mitmachen kannst.",
  "home.descriptionBefore":
    "Handverlesene Blaupausen, Mods, Welten und mehr. Kombiniere Tags wie",
  "home.descriptionExample1": "Haus + Auto",
  "home.descriptionBetween":
    ", um ein fahrbares Wohnmobil zu finden — oder",
  "home.descriptionExample2": "Läufer + Mech",
  "home.descriptionAfter":
    "für einen Hexapoden. Kreationen mit geringem Aufwand werden herausgefiltert.",
  "home.indexedOne": "{count} Kreation indexiert",
  "home.indexedMany": "{count} Kreationen indexiert",
  "home.emptyState":
    "Noch keine freigegebenen Kreationen. Starte eine Erfassung und prüfe die Warteschlange.",
  "home.popularBlueprints": "Beliebte Blaupausen",
  "home.popularMods": "Beliebte Mods",
  "home.popularWorlds": "Beliebte Welten",
  "home.popularChallenges": "Beliebte Challenges",
  "home.newestHeading": "Neueste Einträge",
  "home.browseHeading": "Katalog durchstöbern",
  "home.viewAll": "Alle ansehen →",
  "compare.heading": "Vergleichen",
  "compare.subheading": "Vergleich von {count} Kreationen",
  "compare.field": "Feld",
  "compare.fieldKind": "Typ",
  "compare.fieldAuthor": "Autor",
  "compare.fieldSubs": "Abonnenten",
  "compare.fieldFavorites": "Favoriten",
  "compare.fieldRating": "Bewertung",
  "compare.fieldSiteNet": "Site-Stimmen (netto)",
  "compare.fieldOnSteam": "Erstellt auf Steam",
  "compare.fieldOnSite": "Auf der Seite freigegeben",
  "compare.fieldTags": "Tags",
  "compare.fieldLinks": "Links",
  "compare.openOnSite": "Öffnen ↗",
  "compare.add": "Vergleichen",
  "compare.inBasket": "Im Korb",
  "compare.added": "Zum Vergleichskorb hinzugefügt",
  "compare.removed": "Aus dem Vergleichskorb entfernt",
  "compare.replacedOldest": "Korb voll — ältestes ersetzt",
  "compare.addAria": "Diese Kreation zum Vergleichskorb hinzufügen",
  "compare.removeAria": "Diese Kreation aus dem Vergleichskorb entfernen",
  "compare.basketLabel": "{count} im Korb",
  "compare.basketHint": "Eine weitere hinzufügen",
  "compare.openButton": "Vergleichen →",
  "compare.clearAria": "Vergleichskorb leeren",
  "compare.emptyHelp": "Füge mindestens 2 Kreationen aus einer beliebigen Kreations-Seite zum Vergleichskorb hinzu.",
  "compare.needTwo": "Füge mindestens eine weitere Kreation hinzu, um zu vergleichen.",
  "compare.browseLink": "Kreationen durchstöbern",
  "home.surpriseMe": "Überrasch mich",
  "home.surpriseMeHint": "Zu einer zufälligen Kreation springen",
  "author.totalCreations": "Kreationen",
  "author.totalSubs": "Abonnenten gesamt",
  "author.kindBreakdown": "Nach Typ",
  "author.topCreation": "Top-Kreation",
  "rss.titleByAuthor": "Neueste von {name}",
  "rss.descriptionByAuthor": "Neueste freigegebene Scrap-Mechanic-Workshop-Kreationen von {name}.",
  "rss.titleByTag": "Neueste mit #{tag}",
  "rss.descriptionByTag": "Neueste freigegebene Scrap-Mechanic-Workshop-Kreationen mit Tag #{tag}.",
  "home.forYouHeading": "Für dich",
  "home.forYouHint": "Ausgewählt aus deinen Favoriten und Bewertungen",
  "home.trendingHeading": "Im Trend",
  "home.trendingHint": "Top-Auswahl der Seite",
  "profile.recentComments": "Letzte Kommentare",
  "profile.commentOnWall": "auf {name}s Pinnwand",
  "profile.commentDeleted": "[gelöscht]",
  "profile.commentDeletedTarget": "[Ziel gelöscht]",
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
  "creators.filterAll": "Alle Arten",
  "creators.filterAria": "Ersteller nach Art filtern",

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

  "minigames.eyebrow": "Pausenraum",
  "minigames.title": "Minispiele & mehr",
  "minigames.subtitle":
    "Kleine Scrap-Mechanic-Ablenkungen plus ein paar Eigenarten direkt auf der Seite. Neues erscheint hier, sobald es fertig ist.",
  "minigames.playLabel": "Spielen",
  "minigames.othersLabel": "Sonstiges",
  "minigames.gamesHeading": "Spiele",
  "minigames.othersHeading": "Sonstiges",
  "minigames.comingSoon": "Weitere folgen",
  "minigames.backToIndex": "← Zu den Minispielen",
  "minigames.reset": "Zurücksetzen",
  "minigames.statsLabel": "Sitzungs-Statistik",
  "minigames.stat.streak": "Serie",
  "minigames.stat.bestStreak": "Rekord",
  "minigames.stat.rounds": "Runden",
  "minigames.stat.accuracy": "Trefferquote",
  "minigames.whoIsThis": "Wer ist das?",
  "minigames.zoomAria": "Tippen, um das Bild zu vergrößern",
  "minigames.zoomHint": "Tippen zum Zoomen",
  "minigames.zoomDialogLabel": "Vergrößertes Charakterbild",
  "minigames.wrongReset": "Falsch — Serie zurückgesetzt.",
  "minigames.roundWon": "Runde gewonnen! Nächste Runde…",
  "minigames.scrapcha.name": "Scrapcha",
  "minigames.scrapcha.blurb":
    "Erkenne Scrap-Mechanic-Charaktere auf Screenshots. Dasselbe Puzzle wie beim Login, aber endlos — wie lange hältst du deine Serie?",
  "minigames.scrapcha.subtitle":
    "Wähle den Charakter auf dem Bild. Eine falsche Antwort setzt deine Serie zurück — wie weit kommst du?",
  "minigames.blockdle.name": "Blockdle",
  "minigames.blockdle.blurb":
    "Beinahe unmöglicher Scrap-Mechanic-Block-Rater. Neun Hinweise, zehn Versuche, 500+ Blöcke.",
  "minigames.blockdle.subtitle":
    "Errate den Block. Die Werte zeigen, wie nah du dran bist — grün heißt Treffer, Pfeile weisen die Richtung.",
  "minigames.blockdle.mode.daily": "Täglich",
  "minigames.blockdle.mode.endless": "Endlos",
  "minigames.blockdle.inputPlaceholder": "Blocknamen eingeben…",
  "minigames.blockdle.submit": "Raten",
  "minigames.blockdle.attemptsRemaining": "Noch {n}",
  "minigames.blockdle.col.icon": "Icon",
  "minigames.blockdle.col.name": "Name",
  "minigames.blockdle.col.inventoryType": "Inv.-Typ",
  "minigames.blockdle.col.category": "Kategorie",
  "minigames.blockdle.col.material": "Material",
  "minigames.blockdle.col.flammable": "Brennbar",
  "minigames.blockdle.col.level": "Stufe",
  "minigames.blockdle.col.durability": "Haltbark.",
  "minigames.blockdle.col.density": "Dichte",
  "minigames.blockdle.col.friction": "Reibung",
  "minigames.blockdle.col.buoyancy": "Auftrieb",
  "minigames.blockdle.flammable.yes": "Ja",
  "minigames.blockdle.flammable.no": "Nein",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "Heutige Bestenliste",
  "minigames.blockdle.leaderboard.subtitle": "Angemeldete Gewinner, wenigste Versuche zuerst. Setzt sich jeden UTC-Mitternacht zurück.",
  "minigames.blockdle.leaderboard.count": "{n} Fertige",
  "minigames.blockdle.leaderboard.empty": "Heute noch keine Lösung — sei der Erste!",
  "minigames.blockdle.leaderboard.guesses": "{n} Versuche",
  "minigames.blockdle.leaderboard.allTimeTitle": "Allzeit-Champions",
  "minigames.blockdle.leaderboard.allTimeSubtitle": "Alle, die je ein Tagesrätsel gelöst haben. Nach Gesamtsiegen sortiert, Tiebreak nach wenigsten Durchschnittsversuchen.",
  "minigames.blockdle.leaderboard.allTimeEmpty": "Noch niemand hat ein Tagesrätsel gelöst.",
  "minigames.blockdle.leaderboard.wins": "{n} Siege",
  "minigames.blockdle.leaderboard.avg": "Ø {n}",
  "minigames.blockdle.win.title": "Gelöst!",
  "minigames.blockdle.win.body": "In {n}/{max} geschafft.",
  "minigames.blockdle.lose.title": "Keine Versuche mehr",
  "minigames.blockdle.lose.body": "Die Antwort war {name}.",
  "minigames.blockdle.reveal.label": "Antwort",
  "minigames.blockdle.share.button": "Ergebnis teilen",
  "minigames.blockdle.share.copied": "In Zwischenablage kopiert",
  "minigames.blockdle.daily.cta.endless": "Endlos spielen →",
  "minigames.blockdle.daily.cta.tomorrow": "Morgen gibt's einen neuen Block",
  "minigames.blockdle.endless.cta.next": "Nächster Block →",
  "minigames.blockdle.error.unknownBlock": "Diesen Block kennen wir nicht.",
  "minigames.blockdle.error.duplicate": "Schon geraten.",
  "minigames.blockdle.stat.wins": "Siege",
  "minigames.blockdle.stat.losses": "Niederlagen",

  "minigames.silence.name": "Scrap-Mechanic-Stille",
  "minigames.silence.blurb":
    "Wie lange hat Axolot nichts mehr in den Steam-Newsfeed geschrieben? Die Uhr läuft.",
  "minigames.silence.title": "Zeit seit der letzten Scrap-Mechanic-News",
  "minigames.silence.subtitle":
    "Live-Zähler, der den offiziellen Steam-Newsfeed für Scrap Mechanic (appid 387990) liest. Patch, Ankündigung, Dev-Notiz — sobald etwas landet, springt der Zähler zurück.",
  "minigames.silence.months": "Monate",
  "minigames.silence.days": "Tage",
  "minigames.silence.hours": "Stunden",
  "minigames.silence.minutes": "Minuten",
  "minigames.silence.seconds": "Sekunden",
  "minigames.silence.totalSeconds": "Insgesamt {n} Sekunden.",
  "minigames.silence.lastNewsLabel": "Letzter News-Eintrag",
  "minigames.silence.disclaimer":
    "Ein „Monat” ist hier eine 30-Tage-Einheit — das Gefühl zählt mehr als der Kalender. Serverdaten werden alle 10 Minuten aufgefrischt.",
  "minigames.silence.error":
    "Der Steam-Newsfeed ist gerade nicht erreichbar. Versuch es in ein paar Minuten nochmal.",

  "creation.backToNewest": "← Zurück zu Neueste",
  "creation.by": "von",
  "creation.viewOnSteamWorkshop": "Im Steam Workshop ansehen ↗",
  "creation.share": "Teilen",
  "creation.shareAria": "Link zu dieser Kreation kopieren",
  "creation.shareCopied": "Link in die Zwischenablage kopiert.",
  "creation.shareCopiedShort": "Kopiert",
  "creation.shareFailed": "Link konnte nicht kopiert werden.",
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
  "settings.supportLink": "Die Seite unterstützen →",
  "settings.terms": "Nutzungsbedingungen",
  "settings.privacy": "Datenschutz",

  "settings.funMode.title": "Spaß-Modus",
  "settings.funMode.hint":
    "Schalte die Teile der Seite frei, die rein zum Spaß existieren — Sound-Effekte im Deploy-Banner, Moderator-Pranks aus /admin/abuse wie der gefälschte Neustart. Echte Deploy-Warnungen werden auch bei ausgeschaltetem Spaß-Modus angezeigt (du musst trotzdem vor dem Neustart speichern), nur eben leise und ohne Pranks.",
  "settings.funMode.off": "Aus",
  "settings.funMode.on": "An",
  "settings.funMode.offHint": "Leise, keine Pranks.",
  "settings.funMode.onHint": "Sounds und Pranks sind an.",
  "settings.funMode.extremeTitle": "EXTREMER SPAß-MODUS.",
  "settings.funMode.extremeDescription":
    "Eine weitere Stufe über dem Spaß-Modus. Jeder Klick erzeugt ein Treffer-Sprite und einen Sound an deinem Cursor (schnelle Klicks können sich überlagern), und wenn der Deploy-Banner-Alarm Null erreicht, läuft ein stummes Vollbild-Atomvideo einige Sekunden lang und schließt sich dann von selbst. Spaß-Modus abzuschalten setzt auch diesen zurück.",
  "settings.funMode.extremeLabelOn": "EXTREMER SPAß — AN",
  "settings.funMode.extremeLabelOff": "EXTREMER SPAß — AUS",
  "settings.funMode.extremeHintDisabled":
    "Schalte zuerst den Spaß-Modus ein — EXTREM braucht Spaß als Grundlage.",
  "settings.funMode.extremeHintOn":
    "Klicks erzeugen einen gekippten Hitmarker plus Sound (können sich überlappen). Der Fake-Reboot-Alarm löst jetzt ein stummes Vollbild-Atomvideo aus. Schalte es ab, wenn es nervt.",
  "settings.funMode.extremeHintOff":
    "Schalte ihn ein, um Klickeffekte und das Atomvideo beim Alarm scharfzustellen.",

  "error.title": "Etwas ist schiefgelaufen.",
  "error.body":
    "Beim Laden dieser Seite ist ein unerwarteter Fehler aufgetreten. Bitte versuche es gleich noch einmal.",
  "error.retry": "Erneut versuchen",
  "globalError.title": "Etwas ist schiefgelaufen.",
  "globalError.body":
    "Ein schwerwiegender Fehler verhinderte das Laden der Seite. Bitte versuche es erneut.",
  "globalError.retry": "Erneut versuchen",
  "notFound.eyebrow": "404",
  "notFound.title": "Hier ist nichts.",
  "notFound.body":
    "Die Seite oder Kreation, die du gesucht hast, existiert auf dieser Seite nicht.",
  "notFound.home": "Zurück zur Startseite",
  "notFound.search": "Nach einer Kreation suchen →",

  "footer.online": "{online} online",
  "footer.signedInTotal": "insgesamt {total} angemeldet",

  "support.metadataTitle": "Die Seite unterstützen",
  "support.metadataDescription":
    "Konkrete Wege, mit denen du hilfst, die Scrap Mechanic Search Engine am Laufen zu halten und weiterzuentwickeln — vom Teilen von Links bis zum Melden von Bugs.",
  "support.eyebrow": "Mitmachen",
  "support.heading": "Wie du helfen kannst",
  "support.intro":
    "Die Seite läuft derzeit auf kostenlosen Tarifen — das hält sie online, lässt sie aber nicht von selbst wachsen. Sie bleibt nützlich, weil Leute wie du mitmachen. Hier ist alles, was wirklich einen Unterschied macht.",
  "support.spreadHeading": "Sag es weiter",
  "support.spreadP1":
    "Die meisten, die nach Scrap-Mechanic-Kreationen suchen, wühlen sich immer noch durch Steams eigenen Workshop-Browser. Einem Freund Bescheid geben, einen Link in einem Discord posten oder eine Kreation auf Reddit teilen — das ist mit Abstand das Wirkungsvollste, was du tun kannst.",
  "support.spreadP2Before": "Jede Kreationsseite hat jetzt einen",
  "support.spreadP2ShareLabel": "Teilen",
  "support.spreadP2Between": "-Button neben",
  "support.spreadP2ViewLabel": "Auf Steam Workshop ansehen",
  "support.spreadP2After": "— ein Klick kopiert den Link.",
  "support.spreadP3Before": "Es gibt außerdem eine",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "— der Beitritt ist kostenlos, und Mitglieder bekommen Ankündigungen direkt in ihrem Steam-Client, sobald neue Picks gepostet werden.",
  "support.submitHeading": "Fehlende Kreationen einreichen",
  "support.submitP1Before":
    "Die automatische Erfassung nimmt nur trendige Sachen auf. Versteckte Perlen, die nie viral gegangen sind, fallen durchs Raster. Wenn du eine kennst — deine eigene oder die von jemand anderem — wirf die Workshop-URL auf",
  "support.submitP1Link": "/submit",
  "support.submitP1After": "ein. Ein Moderator prüft sie und sie geht live.",
  "support.voteHeading": "Abstimmen und taggen",
  "support.voteP1":
    "Jede freigeschaltete Kreation hat Up-/Down-Votes und ein Community-Tag-System. Je mehr Leute abstimmen, desto besser funktioniert die Bewertungssortierung. Wenn einer Kreation ein Tag fehlt, nach dem du suchen würdest — füg ihn hinzu. Bei +3 Netto-Stimmen wird er für alle sichtbar.",
  "support.reportHeading": "Melde, was nicht passt",
  "support.reportP1Before": "Jede Kreationsseite hat einen",
  "support.reportP1Label": "Melden",
  "support.reportP1After":
    "-Button. Falsche Tags, schlechte Qualität, Spam, fehlende Co-Autoren — wenn etwas nicht stimmt, melde es. Ein Moderator kümmert sich darum und der Katalog wird ein Stück besser.",
  "support.reportP2": "Einzelne Kommentare kann man ebenfalls melden.",
  "support.suggestHeading": "Features vorschlagen",
  "support.suggestP1Before":
    "Fast jede nennenswerte Verbesserung an der Seite kam von einer Nutzeridee. Poste deine auf dem",
  "support.suggestP1Link": "Ideen-Board",
  "support.suggestP1After":
    "— das ist eine öffentliche, abgestimmte, sortierte Liste, kein schwarzes Loch.",
  "support.bugsHeading": "Bugs melden",
  "support.bugsP1Before":
    "Etwas kaputt, hässlich oder unklar gefunden? Poste es auf dem Ideen-Board mit dem Bug-Tag oder öffne ein Issue auf",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": ". Bestätigte Bug-Meldungen bringen das 🐛",
  "support.bugsP1BadgeLabel": "Bug-Jäger",
  "support.bugsP1BadgeAfter": "-Abzeichen.",
  "support.moneyHeading": "Finanzielle Unterstützung",
  "support.moneyP1":
    "Aktuell kann man nicht spenden — ich habe weder Patreon noch Ko-fi oder Ähnliches eingerichtet. Aber wenn die Seite wächst, sprengt sie irgendwann die kostenlosen Tarife, und dann würde finanzielle Unterstützung wirklich helfen, sie online zu halten und weiterzuentwickeln. Wenn du später auf diesem Weg beitragen möchtest — schau wieder vorbei, ich füge hier einen Link hinzu, sobald etwas eingerichtet ist.",
  "support.moneyP2":
    "Bis dahin sind die oben genannten Punkte das Nützlichste, was du tun kannst.",

  "about.metadataTitle": "Über · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "Wie die Scrap Mechanic Search Engine Workshop-Kreationen kuratiert, erfasst und prüft.",
  "about.eyebrow": "So funktioniert es",
  "about.heading": "Was ist diese Seite?",
  "about.shortVersion": "Die Kurzfassung",
  "about.shortVersionBody":
    "Ein handverlesenes, durchsuchbares Verzeichnis von Scrap Mechanic Steam Workshop-Kreationen. Qualität geht vor Quantität: Jeder Eintrag auf der öffentlichen Seite hat eine menschliche Prüfung durchlaufen, und Einträge mit geringer Resonanz werden bereits vor dieser Prüfung aussortiert.",
  "about.pipelineHeading": "Der Ablauf",
  "about.step1Heading": "1. Automatische Erfassung",
  "about.step1Body":
    "Ein täglicher Cron-Job ruft die neuesten Workshop-Einträge über die Steam Web API ab. Einträge, die unter einem für jede Art festgelegten Follower- und Alters-Schwellenwert liegen, werden herausgefiltert — so bleiben frische Uploads ohne Abonnenten und Einträge mit manipulierten Stimmen aus der Triage-Warteschlange fern.",
  "about.step1TableHeading": "Mindest-Schwellenwerte",
  "about.step1TableKind": "Art",
  "about.step1TableMinSubs": "Min. Abonnenten",
  "about.step1TableMinAge": "Min. Alter",
  "about.step2Heading": "2. Menschliche Prüfung",
  "about.step2Body":
    "Alles, was den Filter passiert, landet in einer Moderatoren-Triage-Warteschlange. Moderatoren genehmigen, lehnen ab oder fordern Änderungen an. Genehmigte Einträge erhalten öffentliche Tags und erscheinen im Katalog; abgelehnte Einträge bleiben aus zukünftigen Erfassungen ausgeschlossen.",
  "about.step3Heading": "3. Community-Einreichungen",
  "about.step3BodyBefore":
    "Jeder mit einem verifizierten Steam-Konto kann einen Eintrag manuell vorschlagen über",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    ". Diese umgehen den Follower-/Alters-Filter, durchlaufen aber dieselbe Moderatorenprüfung — Community-Einreichungen werden markiert, damit Mods sie priorisieren können.",
  "about.whatIfHeading": "Was, wenn meine Kreation nicht auftaucht?",
  "about.whatIfBody":
    "Wenn eine Kreation nicht auf der Seite ist, liegt das fast immer daran, dass sie unter dem Auto-Erfassungs-Schwellenwert liegt und noch niemand sie manuell eingereicht hat. Reiche sie unter /submit ein — das dauert zehn Sekunden, und ein Mod prüft sie in der Regel innerhalb von ein bis zwei Tagen.",
  "about.costHeading": "Kosten & Nachhaltigkeit",
  "about.costBody":
    "Der gesamte Stack läuft auf kostenlosen Tarifen — Vercel Hobby fürs Hosting, Neon Postgres für die Datenbank, Steams öffentliche Web API für die Daten. Keine kostenpflichtigen Dienste, keine Werbung, keine Tracker abgesehen von grundlegender Server-Analytik. Wenn du helfen willst, das so zu halten, schau auf die Seite /support.",
  "about.thresholdsDays": "{n} Tage",

  "terms.metadataTitle": "Nutzungsbedingungen",
  "terms.metadataDescription":
    "Regeln für die Nutzung der Website und das Einstellen von Inhalten.",
  "terms.heading": "Nutzungsbedingungen",
  "terms.lastUpdated": "Zuletzt aktualisiert im April 2026.",
  "terms.h2What": "Was diese Website ist",
  "terms.pWhat":
    "Scrap Mechanic Search Engine ist ein kostenloses, von der Community betriebenes Verzeichnis, das auf Steam-Workshop-Inhalte für das Spiel Scrap Mechanic verweist. Wir stehen in keinerlei Verbindung zu Axolot Games oder Valve. Die Workshop-Dateien selbst werden auf Steam gehostet; wir speichern lediglich Metadaten (Titel, Beschreibung, Tags, Vorschaubild-URL) und verlinken zurück.",
  "terms.h2Account": "Konto",
  "terms.pAccount1":
    "Die Anmeldung erfolgt über Steam OpenID — Ihr Steam-Passwort sehen wir nie. Mit der Anmeldung stimmen Sie diesen Bedingungen und unserer ",
  "terms.pAccountLink": "Datenschutzerklärung",
  "terms.pAccount2":
    " zu. Sie sind für die Sicherheit Ihres Steam-Kontos selbst verantwortlich.",
  "terms.h2Rules": "Community-Regeln",
  "terms.pRulesIntro":
    "Wenn Sie Kommentare, Tags, Vorschläge oder Einreichungen veröffentlichen:",
  "terms.liRulesDecent":
    "Verhalten Sie sich anständig. Keine Belästigung, Beleidigungen oder Drohungen.",
  "terms.liRulesSpam": "Kein Spam, keine Werbung, keine themenfremden Inhalte.",
  "terms.liRulesAppid":
    "Reichen Sie ausschließlich Workshop-Inhalte für Scrap Mechanic (appid 387990) ein. Einreichungen für andere Spiele werden automatisch abgelehnt.",
  "terms.liRulesPii":
    "Veröffentlichen Sie keine personenbezogenen Daten anderer Personen.",
  "terms.liRulesExploit":
    "Versuchen Sie nicht, die Website zu beschädigen, mittels Brute-Force-Angriff zu kompromittieren oder auszunutzen.",
  "terms.pRulesMods":
    "Moderatoren können Inhalte ausblenden sowie Konten verwarnen, stummschalten oder sperren, die gegen diese Regeln verstoßen. Schwere oder wiederholte Verstöße können zu einer dauerhaften Sperre führen.",
  "terms.h2Content": "Ihre Inhalte",
  "terms.pContent":
    "Von Ihnen veröffentlichte Kommentare und Vorschläge bleiben Ihrem Persona-Namen zugeschrieben und können auch nach Ihrem Verlassen der Website in Thread-Form erhalten bleiben, damit laufende Diskussionen weiterhin nachvollziehbar sind. Die Urheberrechte an allem, was Sie verfassen, verbleiben bei Ihnen; mit der Veröffentlichung räumen Sie der Website ein einfaches, nicht ausschließliches Recht ein, diese Inhalte anderen Nutzern anzuzeigen.",
  "terms.h2Takedowns": "Workshop-Inhalte und Löschanfragen",
  "terms.pTakedowns1":
    "Die eigentlichen Dateien und Bilder jedes Workshop-Inhalts werden von Steam gehostet. Falls Ihr Workshop-Inhalt hier aufgeführt ist und Sie dessen Entfernung wünschen (z. B. weil Sie ihn auf Steam depubliziert haben), eröffnen Sie bitte ein Issue im ",
  "terms.pTakedownsLink": "GitHub-Repository",
  "terms.pTakedowns2":
    " des Projekts oder wenden Sie sich an einen Moderator; wir werden ihn dann entfernen.",
  "terms.h2Warranty": "Keine Gewährleistung",
  "terms.pWarranty":
    "Die Website wird „wie besehen“ bereitgestellt. Funktionen können sich ändern oder entfallen, die Website kann ausfallen, Daten können fehlerhaft sein. Verlassen Sie sich bei wichtigen Angelegenheiten nicht darauf.",
  "terms.h2Changes": "Änderungen",
  "terms.pChanges":
    "Wir können diese Bedingungen aktualisieren. Wesentliche Änderungen werden in den Versionshinweisen vermerkt. Die weitere Nutzung nach einer Änderung gilt als Annahme der aktualisierten Fassung.",

  "privacy.metadataTitle": "Datenschutz",
  "privacy.metadataDescription":
    "Was wir erheben, warum und wie lange wir es speichern.",
  "privacy.h1": "Datenschutz",
  "privacy.lastUpdated": "Zuletzt aktualisiert im April 2026.",
  "privacy.h2Short": "Die Kurzfassung",
  "privacy.pShort":
    "Dies ist ein von der Community betriebenes, nicht kommerzielles Verzeichnis von Scrap Mechanic Workshop-Kreationen. Wir verkaufen keine Daten, schalten keine Werbung und setzen keinen Analyse-Tracker ein, der Sie verfolgt. Wenn Sie sich nie anmelden, erfahren wir nie, wer Sie sind.",
  "privacy.h2Store": "Was wir speichern",
  "privacy.pStoreIntro": "Wenn Sie sich mit Steam anmelden, speichern wir:",
  "privacy.liStoreId": "Ihre öffentliche SteamID, Ihren Personanamen und die URL Ihres Avatars.",
  "privacy.liStoreAge":
    "Das Alter Ihres Steam-Kontos und Ihre Scrap Mechanic-Spielzeit — diese Angaben stammen von Steam und werden verwendet, um neu erstellte Wegwerfkonten herauszufiltern.",
  "privacy.liStoreActivity":
    "Die Zeitpunkte, zu denen Sie sich angemeldet, kommentiert, abgestimmt, favorisiert oder einen Beitrag eingereicht haben — damit Moderatoren die Lesbarkeit der Seite wahren können.",
  "privacy.pStoreNot":
    "Wir erheben <strong>nicht</strong> Ihre E-Mail-Adresse, Ihr Passwort, Ihre Telefonnummer, Ihren echten Namen, Ihre IP-Adresse oder Ihren Browserverlauf.",
  "privacy.h2Cookies": "Cookies",
  "privacy.liCookieSession":
    "<code>smse_session</code> — angemeldete Sitzung, läuft nach einer Woche Inaktivität ab.",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code> — kurzlebiger Status (30 Min.) für die Anti-Bot-Prüfung.",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code> — wird nach bestandener Prüfung gesetzt, gilt 30 Tage.",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code> — merkt sich, ob Sie Steam-Bewertungen, Website-Bewertungen oder beide bevorzugen.",
  "privacy.liCookieTheme":
    "<code>smse_theme</code> — merkt sich Ihr gewähltes Farbschema.",
  "privacy.pCookieFooter":
    "Alle Cookies sind First-Party, signiert und dort HTTP-only, wo es darauf ankommt. Keine Werbetracker.",
  "privacy.h2Where": "Wo die Daten gespeichert werden",
  "privacy.liWhereDb": "Datenbank: Neon (serverloses Postgres, kostenloser Tarif).",
  "privacy.liWhereHost": "Hosting: Vercel.",
  "privacy.liWhereSteam": "Workshop-Metadaten und Miniaturansichten: Steam (per Hotlink).",
  "privacy.pWhereLogs":
    "Vercel und Neon können kurzlebige Betriebsprotokolle aufbewahren. Wir nehmen keine personenbezogenen Daten in Protokolleinträge auf, die über das zur Fehlerbehebung Erforderliche hinausgehen.",
  "privacy.h2Controls": "Ihre Kontrollmöglichkeiten",
  "privacy.liControlsStop":
    "Beenden Sie die Nutzung der Seite jederzeit — abgemeldete Besucher hinterlassen keine identifizierenden Daten.",
  "privacy.liControlsDeletePre":
    "Fordern Sie die Löschung Ihrer Kontodaten an, indem Sie ein Issue auf ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    " des Projekts öffnen. Von Ihnen veröffentlichte Inhalte (Kommentare, Vorschläge) werden möglicherweise anonymisiert statt gelöscht, damit Diskussionsstränge lesbar bleiben.",
  "privacy.h2Changes": "Änderungen",
  "privacy.pChanges":
    "Wenn sich diese Richtlinie wesentlich ändert, wird die Aktualisierung in den Versionshinweisen der Website angekündigt. Diese Seite zeigt stets die aktuellste Fassung.",

  "locale.picker.label": "Sprache",
};

const pl: Dictionary = {
  "nav.newest": "Najnowsze",
  "nav.browse": "Przeglądaj",
  "nav.search": "Szukaj",
  "nav.creators": "Twórcy",
  "nav.ideas": "Pomysły",
  "nav.whatsNew": "Co nowego",
  "nav.reviews": "Recenzje gier",
  "nav.submit": "Dodaj",
  "nav.signIn": "Zaloguj przez Steam",
  "nav.settings": "Ustawienia",
  "nav.minigames": "Minigry i inne",
  "nav.adminTriage": "Admin triage",
  "nav.about": "O stronie",
  "nav.guide": "Jak korzystać ze strony",
  "nav.support": "Wesprzyj stronę",
  "nav.favourites": "Twoje ulubione",
  "nav.notifications": "Powiadomienia",
  "nav.submissions": "Twoje zgłoszenia",

  "kind.blueprints": "Schematy",
  "kind.mods": "Mody",
  "kind.worlds": "Światy",
  "kind.challenges": "Wyzwania",
  "kind.tiles": "Kafle",
  "kind.customGames": "Gry niestandardowe",
  "kind.terrain": "Teren",
  "kind.other": "Inne",

  "kind.blueprint": "Schemat",
  "kind.mod": "Mod",
  "kind.world": "Świat",
  "kind.challenge": "Wyzwanie",
  "kind.tile": "Kafel",
  "kind.customGame": "Gra niestandardowa",
  "kind.terrainAsset": "Teren",
  "kind.creationFallback": "Kreacja",

  "rss.title": "Scrap Mechanic Search Engine — Najnowsze",
  "rss.description":
    "Najnowsze zatwierdzone kreacje z Warsztatu Scrap Mechanic na Scrap Mechanic Search Engine.",
  "rss.by": "od",

  "submit.metadataTitle":
    "Prześlij kreację — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "Prześlij kreację z Warsztatu Scrap Mechanic, której cron jeszcze nie znalazł. Zatwierdzone wpisy pojawiają się w publicznym feedzie z odznaką Community.",
  "submit.introBefore":
    "Masz perełkę, której cron jeszcze nie znalazł? Prześlij dowolny URL lub ID z Warsztatu Steam — moderator to sprawdzi i trafi to na publiczny feed z odznaką",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "z twoim wkładem.",
  "submit.privateProfileTitle":
    "Nie mogliśmy zweryfikować wieku twojego konta Steam.",
  "submit.privateProfileBody":
    "Twój profil Steam jest prywatny, więc data utworzenia konta jest ukryta. Ustaw profil jako publiczny i zaloguj się ponownie — lub wyślij moderatorowi krótką odwoławczą prośbę, a on ręcznie odblokuje blokadę.",
  "submit.privateProfileAppeal": "Odwołanie od blokady wiekowej →",
  "submit.tooYoungTitle": "Twoje konto Steam ma mniej niż 7 dni.",
  "submit.tooYoungBody":
    "To zakodowany cooldown, żeby świeże sock-puppetowe konta nie spamowały strony. To nie jest coś, co moderator może obejść w przypadku „za świeżego” konta — po prostu musisz poczekać.",
  "submit.tooYoungBodyStrong": "moderator nie może obejść",
  "submit.tooYoungClearsOn":
    "Twoje konto przejdzie blokadę {date}. Wróć wtedy.",
  "submit.acceptedForms": "Akceptowane formaty",
  "submit.queueExplain":
    "Zgłoszenia trafiają do kolejki moderacji. Pojawiają się publicznie po zatwierdzeniu; cron nie będzie próbował ich ponownie przetworzyć.",
  "submit.curious": "Ciekawy, co wchodzi i dlaczego?",
  "submit.howItWorks": "Jak to działa",
  "submit.form.urlLabel": "URL Warsztatu Steam lub published-file ID",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "Wysyłanie…",
  "submit.form.submitButton": "Wyślij do przeglądu",
  "submit.form.successToast":
    "Wysłane — moderator wkrótce to sprawdzi.",
  "submit.form.errorToast":
    "Nie udało się wysłać. Spróbuj ponownie lub sprawdź URL.",
  "submit.form.queuedToast": "{title} w kolejce moderacji.",
  "submit.form.pendingBefore": "Dzięki —",
  "submit.form.pendingAfter": "oczekuje na przegląd moderatora.",
  "submit.form.backHome": "Powrót do strony głównej ↗",

  "home.heroTitle": "Znajdź to, co najlepsze z Warsztatu.",
  "home.supportCalloutBefore":
    "Chcesz pomóc w rozwoju tego projektu? Zajrzyj na",
  "home.supportCalloutLink": "Wesprzyj stronę",
  "home.supportCalloutAfter":
    ", aby zobaczyć konkretne sposoby, w jakie możesz pomóc.",
  "home.descriptionBefore":
    "Ręcznie wyselekcjonowane Schematy, Mody, Światy i inne. Łącz tagi, np.",
  "home.descriptionExample1": "dom + samochód",
  "home.descriptionBetween":
    ", aby znaleźć kempera, albo",
  "home.descriptionExample2": "krocząc + mech",
  "home.descriptionAfter":
    "— dla heksapoda. Niskiej jakości kreacje są odfiltrowywane.",
  "home.indexedOne": "{count} kreacja w indeksie",
  "home.indexedMany": "{count} kreacji w indeksie",
  "home.emptyState":
    "Jeszcze nie ma zatwierdzonych kreacji. Uruchom indeksację i przejrzyj kolejkę.",
  "home.popularBlueprints": "Popularne schematy",
  "home.popularMods": "Popularne mody",
  "home.popularWorlds": "Popularne światy",
  "home.popularChallenges": "Popularne wyzwania",
  "home.newestHeading": "Najnowsze pozycje",
  "home.browseHeading": "Przeglądaj katalog",
  "home.viewAll": "Zobacz wszystko →",
  "compare.heading": "Porównaj",
  "compare.subheading": "Porównywanie {count} kreacji",
  "compare.field": "Pole",
  "compare.fieldKind": "Typ",
  "compare.fieldAuthor": "Autor",
  "compare.fieldSubs": "Subskrybenci",
  "compare.fieldFavorites": "Ulubione",
  "compare.fieldRating": "Ocena",
  "compare.fieldSiteNet": "Głosy strony (netto)",
  "compare.fieldOnSteam": "Utworzono na Steam",
  "compare.fieldOnSite": "Zatwierdzono na stronie",
  "compare.fieldTags": "Tagi",
  "compare.fieldLinks": "Linki",
  "compare.openOnSite": "Otwórz ↗",
  "compare.add": "Porównaj",
  "compare.inBasket": "W koszyku",
  "compare.added": "Dodano do koszyka porównań",
  "compare.removed": "Usunięto z koszyka porównań",
  "compare.replacedOldest": "Koszyk pełny — zastąpiono najstarszy",
  "compare.addAria": "Dodaj tę kreację do koszyka porównań",
  "compare.removeAria": "Usuń tę kreację z koszyka porównań",
  "compare.basketLabel": "{count} w koszyku",
  "compare.basketHint": "Dodaj jeszcze jedną",
  "compare.openButton": "Porównaj →",
  "compare.clearAria": "Wyczyść koszyk porównań",
  "compare.emptyHelp": "Dodaj co najmniej 2 kreacje do koszyka porównań z dowolnej strony kreacji.",
  "compare.needTwo": "Dodaj jeszcze jedną kreację, aby porównać.",
  "compare.browseLink": "Przeglądaj kreacje",
  "home.surpriseMe": "Zaskocz mnie",
  "home.surpriseMeHint": "Skocz do losowej kreacji",
  "author.totalCreations": "Kreacje",
  "author.totalSubs": "Łączna liczba subskrybentów",
  "author.kindBreakdown": "Według typu",
  "author.topCreation": "Najlepsza kreacja",
  "rss.titleByAuthor": "Najnowsze od {name}",
  "rss.descriptionByAuthor": "Najnowsze zatwierdzone kreacje Scrap Mechanic od {name}.",
  "rss.titleByTag": "Najnowsze z tagiem #{tag}",
  "rss.descriptionByTag": "Najnowsze zatwierdzone kreacje Scrap Mechanic z tagiem #{tag}.",
  "home.forYouHeading": "Dla Ciebie",
  "home.forYouHint": "Wybrane z Twoich ulubionych i głosów",
  "home.trendingHeading": "Na czasie",
  "home.trendingHint": "Najlepsze ze strony",
  "profile.recentComments": "Ostatnie komentarze",
  "profile.commentOnWall": "na ścianie {name}",
  "profile.commentDeleted": "[usunięto]",
  "profile.commentDeletedTarget": "[cel usunięto]",
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
  "creators.filterAll": "Wszystkie rodzaje",
  "creators.filterAria": "Filtruj twórców według rodzaju",

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

  "minigames.eyebrow": "Sala relaksu",
  "minigames.title": "Minigry i inne",
  "minigames.subtitle":
    "Małe rozrywki w stylu Scrap Mechanic plus kilka dziwactw prosto na stronie. Kolejne pojawią się tu, gdy będą gotowe.",
  "minigames.playLabel": "Zagraj",
  "minigames.othersLabel": "Inne",
  "minigames.gamesHeading": "Gry",
  "minigames.othersHeading": "Inne",
  "minigames.comingSoon": "Wkrótce więcej",
  "minigames.backToIndex": "← Do minigier",
  "minigames.reset": "Zresetuj",
  "minigames.statsLabel": "Statystyki sesji",
  "minigames.stat.streak": "Seria",
  "minigames.stat.bestStreak": "Rekord",
  "minigames.stat.rounds": "Rundy",
  "minigames.stat.accuracy": "Celność",
  "minigames.whoIsThis": "Kto to?",
  "minigames.zoomAria": "Dotknij, aby powiększyć",
  "minigames.zoomHint": "Dotknij, aby powiększyć",
  "minigames.zoomDialogLabel": "Powiększony obrazek postaci",
  "minigames.wrongReset": "Źle — seria zresetowana.",
  "minigames.roundWon": "Runda wygrana! Kolejna…",
  "minigames.scrapcha.name": "Scrapcha",
  "minigames.scrapcha.blurb":
    "Rozpoznawaj postacie Scrap Mechanic ze zrzutów ekranu. Ta sama zagadka co przy logowaniu, ale bez końca — jak długą serię utrzymasz?",
  "minigames.scrapcha.subtitle":
    "Wybierz postać z obrazka. Jeden błąd resetuje serię — jak daleko zajdziesz?",
  "minigames.blockdle.name": "Blockdle",
  "minigames.blockdle.blurb":
    "Prawie niemożliwy odgadywacz klocków Scrap Mechanic. Dziewięć wskazówek, dziesięć prób, 500+ klocków.",
  "minigames.blockdle.subtitle":
    "Zgadnij klocek. Statystyki podpowiadają, jak blisko jesteś — zielony to trafienie, strzałki wskazują kierunek.",
  "minigames.blockdle.mode.daily": "Dzienny",
  "minigames.blockdle.mode.endless": "Bez końca",
  "minigames.blockdle.inputPlaceholder": "Wpisz nazwę klocka…",
  "minigames.blockdle.submit": "Zgadnij",
  "minigames.blockdle.attemptsRemaining": "Zostało {n}",
  "minigames.blockdle.col.icon": "Ikona",
  "minigames.blockdle.col.name": "Nazwa",
  "minigames.blockdle.col.inventoryType": "Typ",
  "minigames.blockdle.col.category": "Kategoria",
  "minigames.blockdle.col.material": "Materiał",
  "minigames.blockdle.col.flammable": "Palny",
  "minigames.blockdle.col.level": "Poziom",
  "minigames.blockdle.col.durability": "Wytrz.",
  "minigames.blockdle.col.density": "Gęst.",
  "minigames.blockdle.col.friction": "Tarcie",
  "minigames.blockdle.col.buoyancy": "Pływaln.",
  "minigames.blockdle.flammable.yes": "Tak",
  "minigames.blockdle.flammable.no": "Nie",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "Dzisiejsza tabela wyników",
  "minigames.blockdle.leaderboard.subtitle": "Zalogowani zwycięzcy, od najmniejszej liczby prób. Reset co północ UTC.",
  "minigames.blockdle.leaderboard.count": "{n} ukończonych",
  "minigames.blockdle.leaderboard.empty": "Nikt jeszcze dziś nie rozwiązał — bądź pierwszy!",
  "minigames.blockdle.leaderboard.guesses": "{n} prób",
  "minigames.blockdle.leaderboard.allTimeTitle": "Mistrzowie wszech czasów",
  "minigames.blockdle.leaderboard.allTimeSubtitle": "Wszyscy, którzy kiedykolwiek rozwiązali dzienną zagadkę. Sortowanie wg zwycięstw, przy remisie wg średniej liczby prób.",
  "minigames.blockdle.leaderboard.allTimeEmpty": "Nikt jeszcze nie rozwiązał żadnej dziennej zagadki.",
  "minigames.blockdle.leaderboard.wins": "{n} wygranych",
  "minigames.blockdle.leaderboard.avg": "średnio {n}",
  "minigames.blockdle.win.title": "Zgadnięte!",
  "minigames.blockdle.win.body": "Za {n}/{max} prób.",
  "minigames.blockdle.lose.title": "Koniec prób",
  "minigames.blockdle.lose.body": "Odpowiedź to {name}.",
  "minigames.blockdle.reveal.label": "Odpowiedź",
  "minigames.blockdle.share.button": "Udostępnij wynik",
  "minigames.blockdle.share.copied": "Skopiowano",
  "minigames.blockdle.daily.cta.endless": "Graj bez końca →",
  "minigames.blockdle.daily.cta.tomorrow": "Wróć jutro po nowy klocek",
  "minigames.blockdle.endless.cta.next": "Następny klocek →",
  "minigames.blockdle.error.unknownBlock": "Nie znamy takiego klocka.",
  "minigames.blockdle.error.duplicate": "Już zgadywane.",
  "minigames.blockdle.stat.wins": "Wygrane",
  "minigames.blockdle.stat.losses": "Przegrane",

  "minigames.silence.name": "Cisza Scrap Mechanic",
  "minigames.silence.blurb":
    "Ile czasu minęło, odkąd Axolot coś wrzuciło na kanał wiadomości Steam? Zegar tyka.",
  "minigames.silence.title": "Czas od ostatniej wiadomości o Scrap Mechanic",
  "minigames.silence.subtitle":
    "Licznik na żywo czyta oficjalny kanał wiadomości Steam dla Scrap Mechanic (appid 387990). Łatka, ogłoszenie, notka dewelopera — cokolwiek się pojawi, licznik się resetuje.",
  "minigames.silence.months": "Miesięcy",
  "minigames.silence.days": "Dni",
  "minigames.silence.hours": "Godzin",
  "minigames.silence.minutes": "Minut",
  "minigames.silence.seconds": "Sekund",
  "minigames.silence.totalSeconds": "Łącznie {n} sekund.",
  "minigames.silence.lastNewsLabel": "Najnowsza wiadomość",
  "minigames.silence.disclaimer":
    "„Miesiąc” to tutaj umowne 30 dni — vibe ważniejszy niż kalendarz. Dane po stronie serwera odświeżają się co 10 minut.",
  "minigames.silence.error":
    "Nie udało się teraz pobrać kanału wiadomości Steam. Spróbuj za kilka minut.",

  "creation.backToNewest": "← Do najnowszych",
  "creation.by": "autor:",
  "creation.viewOnSteamWorkshop": "Zobacz w Warsztacie Steam ↗",
  "creation.share": "Udostępnij",
  "creation.shareAria": "Skopiuj link do tej kreacji",
  "creation.shareCopied": "Link skopiowany do schowka.",
  "creation.shareCopiedShort": "Skopiowano",
  "creation.shareFailed": "Nie udało się skopiować linku.",
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
  "settings.supportLink": "Wesprzyj stronę →",
  "settings.terms": "Regulamin",
  "settings.privacy": "Prywatność",

  "settings.funMode.title": "Tryb zabawy",
  "settings.funMode.hint":
    "Włącz elementy strony, które istnieją wyłącznie dla zabawy — efekty dźwiękowe banera wdrożenia, moderatorskie psoty z /admin/abuse, jak fałszywy restart. Prawdziwe ostrzeżenia o wdrożeniu nadal są wyświetlane przy wyłączonym Trybie zabawy (nadal musisz zapisać pracę przed restartem strony), tylko po cichu i bez psot.",
  "settings.funMode.off": "Wył.",
  "settings.funMode.on": "Wł.",
  "settings.funMode.offHint": "Bez dźwięku, bez psot.",
  "settings.funMode.onHint": "Dźwięki i psoty włączone.",
  "settings.funMode.extremeTitle": "EKSTREMALNY TRYB ZABAWY.",
  "settings.funMode.extremeDescription":
    "Nadbudowa nad Trybem zabawy. Każde kliknięcie tworzy sprite hitmarkera i dźwięk przy kursorze (szybkie kliknięcia mogą się nakładać), a gdy alarm banera wdrożenia osiąga zero — na pełnym ekranie odtwarza się ciche wideo nuklearnego wybuchu, które zamyka się po zakończeniu. Wyłączenie Trybu zabawy kaskadowo wyłącza także ten.",
  "settings.funMode.extremeLabelOn": "EKSTREMALNA ZABAWA — WŁ.",
  "settings.funMode.extremeLabelOff": "EKSTREMALNA ZABAWA — WYŁ.",
  "settings.funMode.extremeHintDisabled":
    "Najpierw włącz Tryb zabawy — EKSTREMALNY wymaga podstawowego.",
  "settings.funMode.extremeHintOn":
    "Kliknięcia tworzą przechylony hitmarker + dźwięk (mogą się nakładać). Alarm fałszywego restartu uruchamia teraz ciche pełnoekranowe wideo nuklearnego wybuchu. Wyłącz, jeśli się znudzi.",
  "settings.funMode.extremeHintOff":
    "Włącz, aby aktywować efekty kliknięć i wideo nuklearnego wybuchu na alarm.",

  "error.title": "Coś poszło nie tak.",
  "error.body":
    "Napotkaliśmy nieoczekiwany błąd podczas ładowania strony. Spróbuj ponownie za chwilę.",
  "error.retry": "Spróbuj ponownie",
  "globalError.title": "Coś poszło nie tak.",
  "globalError.body":
    "Krytyczny błąd uniemożliwił załadowanie strony. Spróbuj ponownie.",
  "globalError.retry": "Spróbuj ponownie",
  "notFound.eyebrow": "404",
  "notFound.title": "Tu nic nie ma.",
  "notFound.body":
    "Strona lub kreacja, której szukałeś, nie znajduje się na stronie.",
  "notFound.home": "Powrót do strony głównej",
  "notFound.search": "Szukaj kreacji →",

  "footer.online": "{online} online",
  "footer.signedInTotal": "łącznie {total} zalogowanych",

  "support.metadataTitle": "Wesprzyj stronę",
  "support.metadataDescription":
    "Konkretne sposoby, w jakie możesz pomóc utrzymać i rozwijać Scrap Mechanic Search Engine — od udostępniania linków po zgłaszanie błędów.",
  "support.eyebrow": "Dołącz",
  "support.heading": "Jak możesz pomóc",
  "support.intro":
    "Strona działa obecnie na darmowych planach — utrzymuje ją to w sieci, ale nie pozwala samodzielnie rosnąć. Pozostaje użyteczna dzięki takim ludziom jak ty. Oto wszystko, co naprawdę robi różnicę.",
  "support.spreadHeading": "Rozpowszechniaj",
  "support.spreadP1":
    "Większość osób szukających kreacji do Scrap Mechanic wciąż przekopuje się przez natywną przeglądarkę Warsztatu Steam. Powiedzieć znajomemu, wrzucić link na Discord albo podzielić się kreacją na Reddicie — to zdecydowanie najważniejsza rzecz, jaką możesz zrobić.",
  "support.spreadP2Before": "Każda strona kreacji ma teraz przycisk",
  "support.spreadP2ShareLabel": "Udostępnij",
  "support.spreadP2Between": "obok",
  "support.spreadP2ViewLabel": "Zobacz w Steam Workshop",
  "support.spreadP2After": "— jedno kliknięcie kopiuje link.",
  "support.spreadP3Before": "Jest też",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "— dołączenie jest darmowe, a członkowie dostają ogłoszenia w swoim kliencie Steam, gdy pojawiają się nowe typy.",
  "support.submitHeading": "Zgłaszaj pominięte kreacje",
  "support.submitP1Before":
    "Automatyczna indeksacja wyłapuje tylko trendujące pozycje. Ukryte perełki, które nigdy nie zrobiły furory, przelatują bokiem. Jeśli masz jakąś na myśli — swoją lub czyjąś — wrzuć link z Warsztatu na",
  "support.submitP1Link": "/submit",
  "support.submitP1After": ". Moderator ją sprawdzi i pójdzie na żywo.",
  "support.voteHeading": "Głosuj i taguj",
  "support.voteP1":
    "Każda zatwierdzona kreacja ma głosy w górę/w dół i społecznościowy system tagów. Im więcej osób głosuje, tym lepiej działa sortowanie po ocenach. Jeśli kreacji brakuje tagu, po którym byś jej szukał — dodaj go. Przy +3 netto głosach staje się widoczny dla wszystkich.",
  "support.reportHeading": "Zgłaszaj nieprawidłowości",
  "support.reportP1Before": "Każda strona kreacji ma przycisk",
  "support.reportP1Label": "Zgłoś",
  "support.reportP1After":
    ". Błędne tagi, niska jakość, spam, brakujący współautorzy — jeśli coś jest nie tak, zaznacz to. Moderator się tym zajmie, a katalog stanie się odrobinę lepszy.",
  "support.reportP2": "Pojedyncze komentarze również można zgłaszać.",
  "support.suggestHeading": "Proponuj funkcje",
  "support.suggestP1Before":
    "Niemal każda istotna poprawka strony wzięła się z pomysłu użytkownika. Wrzuć swój na",
  "support.suggestP1Link": "tablicy pomysłów",
  "support.suggestP1After":
    "— to publiczna, przegłosowywana, posegregowana lista, a nie czarna dziura.",
  "support.bugsHeading": "Zgłaszaj błędy",
  "support.bugsP1Before":
    "Znalazłeś coś zepsutego, brzydkiego albo niejasnego? Wrzuć to na tablicę pomysłów z tagiem bug albo otwórz issue na",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": ". Za potwierdzone zgłoszenia błędów dostaje się odznakę 🐛",
  "support.bugsP1BadgeLabel": "Łowca błędów",
  "support.bugsP1BadgeAfter": ".",
  "support.moneyHeading": "Wsparcie finansowe",
  "support.moneyP1":
    "Na razie nie ma jak wpłacić — nie założyłem jeszcze Patreona, Ko-fi ani niczego podobnego. Ale jeśli strona urośnie, w końcu przerośnie darmowe plany, a wtedy wsparcie finansowe naprawdę pomogłoby utrzymać ją online i rozwijać. Jeśli chciałbyś wesprzeć później — zajrzyj ponownie, dodam tu link, gdy tylko coś ustawię.",
  "support.moneyP2":
    "Tymczasem powyższe rzeczy to najbardziej przydatne, co możesz zrobić.",

  "about.metadataTitle": "O projekcie · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "Jak Scrap Mechanic Search Engine selekcjonuje, pobiera i weryfikuje dzieła z Warsztatu.",
  "about.eyebrow": "Jak to działa",
  "about.heading": "Czym jest ta strona?",
  "about.shortVersion": "W skrócie",
  "about.shortVersionBody":
    "Ręcznie selekcjonowany, przeszukiwalny katalog dzieł z Warsztatu Steam do Scrap Mechanic. Jakość ma priorytet nad ilością: każdy element na publicznej stronie przeszedł ręczną weryfikację, a materiały o niskim zainteresowaniu są odfiltrowywane jeszcze przed tym etapem.",
  "about.pipelineHeading": "Potok",
  "about.step1Heading": "1. Automatyczne pobieranie",
  "about.step1Body":
    "Codzienny cron pobiera najnowsze wpisy z Warsztatu przez Steam Web API. Elementy poniżej progu obserwujących i wieku dla danego typu są odfiltrowywane — dzięki temu świeże wysyłki bez subskrybentów i pozycje z nabijanymi głosami nie trafiają do kolejki moderacji.",
  "about.step1TableHeading": "Minimalne progi",
  "about.step1TableKind": "Typ",
  "about.step1TableMinSubs": "Min. subskrybentów",
  "about.step1TableMinAge": "Min. wiek",
  "about.step2Heading": "2. Weryfikacja przez człowieka",
  "about.step2Body":
    "Wszystko, co przejdzie filtr, trafia do kolejki moderacji. Moderatorzy zatwierdzają, odrzucają lub proszą o zmiany. Zatwierdzone elementy otrzymują publiczne tagi i pojawiają się w katalogu; odrzucone są pomijane w przyszłych pobraniach.",
  "about.step3Heading": "3. Zgłoszenia społeczności",
  "about.step3BodyBefore":
    "Każdy z zweryfikowanym kontem Steam może ręcznie zaproponować element przez",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    ". Takie zgłoszenia omijają filtr obserwujących/wieku, ale przechodzą tę samą weryfikację moderatorską — zgłoszenia społeczności są oznaczane, aby moderatorzy mogli nadać im priorytet.",
  "about.whatIfHeading": "Co jeśli mojego dzieła nie ma?",
  "about.whatIfBody":
    "Jeśli dzieła nie ma na stronie, to niemal zawsze dlatego, że jest poniżej progu automatycznego pobierania i nikt go jeszcze nie zgłosił ręcznie. Zgłoś je pod /submit — zajmuje to dziesięć sekund, a moderator zwykle rozpatruje zgłoszenie w ciągu dnia lub dwóch.",
  "about.costHeading": "Koszty i stabilność",
  "about.costBody":
    "Cały stos działa na darmowych planach — Vercel Hobby do hostingu, Neon Postgres jako baza danych, publiczne Steam Web API jako źródło danych. Żadnych płatnych usług, reklam ani trackerów poza podstawową analityką serwera. Jeśli chcesz pomóc to utrzymać, zajrzyj na stronę /support.",
  "about.thresholdsDays": "{n} dni",

  "terms.metadataTitle": "Regulamin",
  "terms.metadataDescription":
    "Zasady korzystania z serwisu i publikowania treści.",
  "terms.heading": "Regulamin korzystania",
  "terms.lastUpdated": "Ostatnia aktualizacja: kwiecień 2026 r.",
  "terms.h2What": "Czym jest ten serwis",
  "terms.pWhat":
    "Scrap Mechanic Search Engine to bezpłatny, prowadzony przez społeczność katalog zawierający odnośniki do treści Steam Workshop dla gry Scrap Mechanic. Nie jesteśmy powiązani z Axolot Games ani Valve. Same pliki Workshop są przechowywane w Steam; my zapisujemy jedynie metadane (tytuł, opis, tagi, adres URL miniatury) i prowadzimy z powrotem do źródła.",
  "terms.h2Account": "Konto",
  "terms.pAccount1":
    "Logowanie odbywa się za pośrednictwem Steam OpenID — nigdy nie widzimy Twojego hasła do Steam. Logując się, akceptujesz niniejszy regulamin oraz naszą ",
  "terms.pAccountLink": "politykę prywatności",
  "terms.pAccount2":
    ". Odpowiadasz za bezpieczeństwo własnego konta Steam.",
  "terms.h2Rules": "Zasady społeczności",
  "terms.pRulesIntro":
    "Publikując komentarze, tagi, sugestie lub zgłoszenia:",
  "terms.liRulesDecent":
    "Zachowuj się przyzwoicie. Żadnego nękania, obelg ani gróźb.",
  "terms.liRulesSpam":
    "Żadnego spamu, reklam ani treści niezwiązanych z tematem.",
  "terms.liRulesAppid":
    "Zgłaszaj wyłącznie treści Workshop dla gry Scrap Mechanic (appid 387990). Zgłoszenia dotyczące innych gier są automatycznie odrzucane.",
  "terms.liRulesPii": "Nie publikuj danych osobowych innych osób.",
  "terms.liRulesExploit":
    "Nie próbuj uszkadzać, łamać metodą brute-force ani wykorzystywać luk serwisu.",
  "terms.pRulesMods":
    "Moderatorzy mogą ukrywać treści, ostrzegać, wyciszać oraz blokować konta naruszające niniejsze zasady. Poważne lub powtarzające się naruszenia mogą skutkować trwałą blokadą.",
  "terms.h2Content": "Twoje treści",
  "terms.pContent":
    "Publikowane przez Ciebie komentarze i sugestie pozostają przypisane do Twojego persona-name i mogą być zachowane w formie wątków także po Twoim odejściu, aby toczące się dyskusje pozostawały zrozumiałe. Zachowujesz prawa do wszystkiego, co napiszesz; publikując daną treść, udzielasz serwisowi niewyłącznego prawa do wyświetlania jej innym użytkownikom.",
  "terms.h2Takedowns": "Treści Workshop i wnioski o usunięcie",
  "terms.pTakedowns1":
    "Właściwe pliki i obrazy każdej pozycji Workshop są hostowane przez Steam. Jeśli Twoja pozycja Workshop jest tutaj widoczna, a chcesz, aby została usunięta (np. wycofałeś/wycofałaś jej publikację na Steam), otwórz zgłoszenie w ",
  "terms.pTakedownsLink": "repozytorium GitHub",
  "terms.pTakedowns2":
    " projektu lub skontaktuj się z moderatorem, a usuniemy ją.",
  "terms.h2Warranty": "Brak gwarancji",
  "terms.pWarranty":
    "Serwis udostępniany jest „w stanie, w jakim jest”. Funkcje mogą się zmieniać lub znikać, serwis może być niedostępny, dane mogą być błędne. Nie polegaj na nim w sprawach istotnych.",
  "terms.h2Changes": "Zmiany",
  "terms.pChanges":
    "Możemy aktualizować niniejszy regulamin. Istotne zmiany zostaną odnotowane w informacjach o wydaniu. Dalsze korzystanie z serwisu po zmianie oznacza akceptację zaktualizowanej wersji.",

  "privacy.metadataTitle": "Prywatność",
  "privacy.metadataDescription":
    "Co zbieramy, dlaczego i jak długo to przechowujemy.",
  "privacy.h1": "Prywatność",
  "privacy.lastUpdated": "Ostatnia aktualizacja: kwiecień 2026.",
  "privacy.h2Short": "W skrócie",
  "privacy.pShort":
    "Jest to prowadzony przez społeczność, niekomercyjny katalog dzieł ze Scrap Mechanic Workshop. Nie sprzedajemy danych, nie wyświetlamy reklam ani nie korzystamy z narzędzi analitycznych, które Cię śledzą. Jeśli nigdy się nie zalogujesz, nigdy nie dowiemy się, kim jesteś.",
  "privacy.h2Store": "Co przechowujemy",
  "privacy.pStoreIntro": "Jeśli zalogujesz się przez Steam, zapisujemy:",
  "privacy.liStoreId": "Twój publiczny SteamID, nazwę profilu oraz adres URL awatara.",
  "privacy.liStoreAge":
    "Wiek Twojego konta Steam i czas gry w Scrap Mechanic — te dane pochodzą ze Steam i służą do odfiltrowywania świeżo utworzonych, jednorazowych kont.",
  "privacy.liStoreActivity":
    "Daty Twoich logowań, komentarzy, głosów, polubień i zgłoszeń — aby moderatorzy mogli utrzymać czytelność serwisu.",
  "privacy.pStoreNot":
    "<strong>Nie</strong> zbieramy Twojego adresu e-mail, hasła, numeru telefonu, prawdziwego imienia i nazwiska, adresu IP ani historii przeglądania.",
  "privacy.h2Cookies": "Pliki cookie",
  "privacy.liCookieSession":
    "<code>smse_session</code> — sesja zalogowanego użytkownika, wygasa po tygodniu nieaktywności.",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code> — krótkotrwały stan (30 min) dla weryfikacji przeciw botom.",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code> — ustawiany po pomyślnej weryfikacji, ważny 30 dni.",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code> — zapamiętuje, czy preferujesz oceny Steam, oceny serwisu, czy obie.",
  "privacy.liCookieTheme":
    "<code>smse_theme</code> — zapamiętuje wybrany motyw kolorystyczny.",
  "privacy.pCookieFooter":
    "Wszystkie pliki cookie są własne, podpisane i oznaczone jako HTTP-only tam, gdzie jest to istotne. Żadnych reklamowych narzędzi śledzących.",
  "privacy.h2Where": "Gdzie przechowywane są dane",
  "privacy.liWhereDb": "Baza danych: Neon (bezserwerowy Postgres, darmowy plan).",
  "privacy.liWhereHost": "Hosting: Vercel.",
  "privacy.liWhereSteam": "Metadane i miniatury Workshop: Steam (bezpośrednie odnośniki).",
  "privacy.pWhereLogs":
    "Vercel i Neon mogą przechowywać krótkotrwałe dzienniki operacyjne. Nie umieszczamy w dziennikach danych osobowych poza tymi, które są niezbędne do naprawy błędów.",
  "privacy.h2Controls": "Twoje kontrole",
  "privacy.liControlsStop":
    "Przestań korzystać z serwisu w dowolnym momencie — niezalogowani odwiedzający nie pozostawiają żadnych danych identyfikujących.",
  "privacy.liControlsDeletePre":
    "Poproś o usunięcie danych swojego konta, otwierając zgłoszenie na ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    " projektu. Opublikowane przez Ciebie treści (komentarze, sugestie) mogą zostać zanonimizowane zamiast usunięte, aby zachować czytelność wątków dyskusji.",
  "privacy.h2Changes": "Zmiany",
  "privacy.pChanges":
    "Jeśli niniejsza polityka ulegnie istotnej zmianie, aktualizacja zostanie ogłoszona w notach wydania serwisu. Ta strona zawsze pokazuje najnowszą wersję.",

  "locale.picker.label": "Język",
};

const uk: Dictionary = {
  "nav.newest": "Нове",
  "nav.browse": "Огляд",
  "nav.search": "Пошук",
  "nav.creators": "Автори",
  "nav.ideas": "Ідеї",
  "nav.whatsNew": "Оновлення",
  "nav.reviews": "Огляди ігор",
  "nav.submit": "Додати",
  "nav.signIn": "Увійти через Steam",
  "nav.settings": "Налаштування",
  "nav.minigames": "Міні-ігри та інше",
  "nav.adminTriage": "Admin triage",
  "nav.about": "Про сайт",
  "nav.guide": "Як користуватися сайтом",
  "nav.support": "Підтримати сайт",
  "nav.favourites": "Ваші обрані",
  "nav.notifications": "Сповіщення",
  "nav.submissions": "Ваші заявки",

  "kind.blueprints": "Креслення",
  "kind.mods": "Моди",
  "kind.worlds": "Світи",
  "kind.challenges": "Виклики",
  "kind.tiles": "Плитки",
  "kind.customGames": "Власні ігри",
  "kind.terrain": "Рельєф",
  "kind.other": "Інше",

  "kind.blueprint": "Креслення",
  "kind.mod": "Мод",
  "kind.world": "Світ",
  "kind.challenge": "Виклик",
  "kind.tile": "Плитка",
  "kind.customGame": "Власна гра",
  "kind.terrainAsset": "Рельєф",
  "kind.creationFallback": "Об'єкт",

  "rss.title": "Scrap Mechanic Search Engine — Найновіші",
  "rss.description":
    "Найсвіжіші схвалені об'єкти Майстерні Scrap Mechanic на Scrap Mechanic Search Engine.",
  "rss.by": "автор:",

  "submit.metadataTitle":
    "Запропонувати об'єкт — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "Запропонуйте об'єкт із Майстерні Scrap Mechanic, який ще не знайшов крон. Схвалені об'єкти з'являються в публічній стрічці з бейджем Community.",
  "submit.introBefore":
    "Знайшли щось вартісне, чого ще немає в каталозі? Надішліть будь-яке посилання або ID із Майстерні Steam — модератор перевірить, і об'єкт з'явиться в публічній стрічці з бейджем",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "що зазначає ваш внесок.",
  "submit.privateProfileTitle":
    "Ми не змогли перевірити вік вашого акаунта Steam.",
  "submit.privateProfileBody":
    "Ваш профіль Steam закритий, тому дата створення прихована. Зробіть профіль публічним і увійдіть знову — або надішліть модератору коротку апеляцію, і він відкриє обмеження вручну.",
  "submit.privateProfileAppeal": "Подати апеляцію →",
  "submit.tooYoungTitle":
    "Вашому акаунту Steam менше 7 днів.",
  "submit.tooYoungBody":
    "Це жорсткий таймер, щоб свіжі фейкові акаунти не спамили сайт. Це не те, що модератор може обійти в разі «надто свіжого» акаунта — просто доведеться зачекати.",
  "submit.tooYoungBodyStrong": "не те, що модератор може обійти",
  "submit.tooYoungClearsOn":
    "Обмеження зніметься {date}. Повертайтеся тоді.",
  "submit.acceptedForms": "Підтримувані формати",
  "submit.queueExplain":
    "Заявки потрапляють у чергу модерації. Вони з'являються публічно після схвалення; крон не намагатиметься повторно їх обробити.",
  "submit.curious": "Цікаво, що проходить і чому?",
  "submit.howItWorks": "Як це працює",
  "submit.form.urlLabel": "Посилання на Майстерню Steam або ID published-file",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "Надсилаємо…",
  "submit.form.submitButton": "Надіслати на розгляд",
  "submit.form.successToast":
    "Надіслано — модератор скоро перевірить.",
  "submit.form.errorToast":
    "Не вдалося надіслати. Спробуйте ще раз або перевірте посилання.",
  "submit.form.queuedToast": "{title} у черзі модерації.",
  "submit.form.pendingBefore": "Дякуємо —",
  "submit.form.pendingAfter": "очікує перевірки модератором.",
  "submit.form.backHome": "На головну ↗",

  "home.heroTitle": "Знайдіть найкраще з Майстерні.",
  "home.supportCalloutBefore":
    "Хочете допомогти проєкту розвиватися? Зазирніть на",
  "home.supportCalloutLink": "Підтримати сайт",
  "home.supportCalloutAfter":
    "— там конкретні способи зробити внесок.",
  "home.descriptionBefore":
    "Вручну відібрані Креслення, Моди, Світи та інше. Комбінуйте теги, наприклад",
  "home.descriptionExample1": "дім + машина",
  "home.descriptionBetween":
    "— щоб знайти жилий фургон, або",
  "home.descriptionExample2": "крокохід + мех",
  "home.descriptionAfter":
    "— для гексапода. Низькоякісні творіння відсіюються.",
  "home.indexedOne": "{count} об'єкт у каталозі",
  "home.indexedMany": "{count} об'єктів у каталозі",
  "home.emptyState":
    "Поки немає схвалених творінь. Запустіть збір і перегляньте чергу.",
  "home.popularBlueprints": "Популярні креслення",
  "home.popularMods": "Популярні моди",
  "home.popularWorlds": "Популярні світи",
  "home.popularChallenges": "Популярні випробування",
  "home.newestHeading": "Найновіші надходження",
  "home.browseHeading": "Перегляд каталогу",
  "home.viewAll": "Дивитися все →",
  "compare.heading": "Порівняти",
  "compare.subheading": "Порівняння {count} творінь",
  "compare.field": "Поле",
  "compare.fieldKind": "Тип",
  "compare.fieldAuthor": "Автор",
  "compare.fieldSubs": "Підписники",
  "compare.fieldFavorites": "Уподобання",
  "compare.fieldRating": "Рейтинг",
  "compare.fieldSiteNet": "Голоси сайту (нетто)",
  "compare.fieldOnSteam": "Створено в Steam",
  "compare.fieldOnSite": "Затверджено на сайті",
  "compare.fieldTags": "Теги",
  "compare.fieldLinks": "Посилання",
  "compare.openOnSite": "Відкрити ↗",
  "compare.add": "Порівняти",
  "compare.inBasket": "У кошику",
  "compare.added": "Додано до кошика порівняння",
  "compare.removed": "Прибрано з кошика порівняння",
  "compare.replacedOldest": "Кошик повний — замінено найстаріше",
  "compare.addAria": "Додати це творіння до кошика порівняння",
  "compare.removeAria": "Прибрати це творіння з кошика порівняння",
  "compare.basketLabel": "{count} у кошику",
  "compare.basketHint": "Додайте ще одне",
  "compare.openButton": "Порівняти →",
  "compare.clearAria": "Очистити кошик порівняння",
  "compare.emptyHelp": "Додайте принаймні 2 творіння до кошика порівняння з будь-якої сторінки творіння.",
  "compare.needTwo": "Додайте ще одне творіння для порівняння.",
  "compare.browseLink": "Перегляд творінь",
  "home.surpriseMe": "Здивуй мене",
  "home.surpriseMeHint": "Перейти до випадкової роботи",
  "author.totalCreations": "Творінь",
  "author.totalSubs": "Усього підписників",
  "author.kindBreakdown": "За типом",
  "author.topCreation": "Найкраще творіння",
  "rss.titleByAuthor": "Нові від {name}",
  "rss.descriptionByAuthor": "Найновіші затверджені творіння Scrap Mechanic від {name}.",
  "rss.titleByTag": "Нові з тегом #{tag}",
  "rss.descriptionByTag": "Найновіші затверджені творіння Scrap Mechanic з тегом #{tag}.",
  "home.forYouHeading": "Для тебе",
  "home.forYouHint": "Підібрано з ваших уподобань і голосів",
  "home.trendingHeading": "У тренді",
  "home.trendingHint": "Найкраще на сайті",
  "profile.recentComments": "Останні коментарі",
  "profile.commentOnWall": "на стіні {name}",
  "profile.commentDeleted": "[видалено]",
  "profile.commentDeletedTarget": "[ціль видалено]",
  "home.noItems": "Поки немає затверджених об'єктів.",

  "common.loading": "Завантаження…",
  "common.save": "Зберегти",
  "common.cancel": "Скасувати",
  "common.delete": "Видалити",
  "common.back": "Назад",
  "common.remove": "Прибрати",
  "common.close": "Закрити",
  "common.signOut": "Вийти",
  "common.search": "Шукати",
  "common.clear": "Очистити",
  "common.more": "Ще →",
  "common.newer": "← Новіше",
  "common.older": "Старіше →",
  "common.page": "Сторінка {n}",
  "common.submit": "Надіслати",

  "newest.title": "Найновіші надходження",
  "newest.subtitle": "Нещодавно затверджені об'єкти з усіх типів Майстерні.",

  "creators.title": "Автори",
  "creators.subtitle":
    "Автори Майстерні, впорядковані за кількістю робіт на сайті. Співавторські роботи зараховуються кожному співавтору.",
  "creators.searchPlaceholder": "Пошук за ім'ям…",
  "creators.searchAria": "Пошук авторів за ім'ям",
  "creators.noMatch": "Авторів не знайдено: «{q}».",
  "creators.empty": "Авторів поки немає.",
  "creators.creationCountOne": "{count} робота",
  "creators.creationCountMany": "{count} робіт",
  "creators.unknownName": "(без імені)",
  "creators.filterAll": "Усі види",
  "creators.filterAria": "Фільтр авторів за видом",

  "search.title": "Пошук",
  "search.placeholder": "Шукати в назвах та описах…",
  "search.noResults": "За вашими фільтрами нічого не знайдено.",

  "me.favourites.title": "Ваші обрані",
  "me.favourites.empty": "Ще немає обраного.",
  "me.submissions.title": "Ваші заявки",
  "me.submissions.empty": "Ви ще нічого не надсилали.",
  "me.notifications.title": "Ваші сповіщення",
  "me.notifications.empty": "Сповіщень поки немає.",
  "me.notifications.markAllRead": "Позначити всі як прочитані",

  "card.communityBadge": "Спільнота",
  "card.unratedLabel": "Без оцінки",
  "card.viewOnSteam": "Відкрити в Steam",

  "minigames.eyebrow": "Зала відпочинку",
  "minigames.title": "Міні-ігри та інше",
  "minigames.subtitle":
    "Невеликі розваги за Scrap Mechanic та кілька дивних штук просто на сайті. Нові з'являтимуться в міру готовності.",
  "minigames.playLabel": "Грати",
  "minigames.othersLabel": "Інше",
  "minigames.gamesHeading": "Ігри",
  "minigames.othersHeading": "Інше",
  "minigames.comingSoon": "Скоро ще",
  "minigames.backToIndex": "← До міні-ігор",
  "minigames.reset": "Скинути",
  "minigames.statsLabel": "Статистика сеансу",
  "minigames.stat.streak": "Серія",
  "minigames.stat.bestStreak": "Рекорд",
  "minigames.stat.rounds": "Раунди",
  "minigames.stat.accuracy": "Точність",
  "minigames.whoIsThis": "Хто це?",
  "minigames.zoomAria": "Натисніть, щоб збільшити",
  "minigames.zoomHint": "Збільшити",
  "minigames.zoomDialogLabel": "Збільшене зображення персонажа",
  "minigames.wrongReset": "Неправильно — серію скинуто.",
  "minigames.roundWon": "Раунд пройдено! Наступний…",
  "minigames.scrapcha.name": "Скрапча",
  "minigames.scrapcha.blurb":
    "Впізнавайте персонажів Scrap Mechanic зі скриншотів. Та сама головоломка, що й при вході, але без кінця — наскільки довгу серію ви втримаєте?",
  "minigames.scrapcha.subtitle":
    "Оберіть персонажа на скриншоті. Одна помилка — і серію скинуто. Наскільки далеко ви зайдете?",
  "minigames.blockdle.name": "Блокдл",
  "minigames.blockdle.blurb":
    "Майже неможливий відгадувач блоків Scrap Mechanic. Дев'ять підказок, десять спроб, 500+ блоків.",
  "minigames.blockdle.subtitle":
    "Вгадайте блок. Характеристики підказують, наскільки ви близько — зелений означає збіг, стрілки вказують напрямок.",
  "minigames.blockdle.mode.daily": "Щоденно",
  "minigames.blockdle.mode.endless": "Нескінченно",
  "minigames.blockdle.inputPlaceholder": "Введіть назву блоку…",
  "minigames.blockdle.submit": "Вгадати",
  "minigames.blockdle.attemptsRemaining": "Залишилось {n}",
  "minigames.blockdle.col.icon": "Іконка",
  "minigames.blockdle.col.name": "Назва",
  "minigames.blockdle.col.inventoryType": "Тип",
  "minigames.blockdle.col.category": "Категорія",
  "minigames.blockdle.col.material": "Матеріал",
  "minigames.blockdle.col.flammable": "Горючий",
  "minigames.blockdle.col.level": "Рівень",
  "minigames.blockdle.col.durability": "Міцн.",
  "minigames.blockdle.col.density": "Щільн.",
  "minigames.blockdle.col.friction": "Тертя",
  "minigames.blockdle.col.buoyancy": "Плавуч.",
  "minigames.blockdle.flammable.yes": "Так",
  "minigames.blockdle.flammable.no": "Ні",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "Сьогоднішня таблиця лідерів",
  "minigames.blockdle.leaderboard.subtitle":
    "Зареєстровані переможці, від найменшої кількості спроб. Скидається щопівночі UTC.",
  "minigames.blockdle.leaderboard.count": "{n} завершили",
  "minigames.blockdle.leaderboard.empty": "Сьогодні ще ніхто не вирішив — станьте першим!",
  "minigames.blockdle.leaderboard.guesses": "{n} спроб",
  "minigames.blockdle.leaderboard.allTimeTitle": "Чемпіони всіх часів",
  "minigames.blockdle.leaderboard.allTimeSubtitle":
    "Усі, хто коли-небудь розв'язав денну загадку. Сортування за перемогами, при рівності — за середньою кількістю спроб.",
  "minigames.blockdle.leaderboard.allTimeEmpty": "Ще ніхто не розв'язав жодної денної загадки.",
  "minigames.blockdle.leaderboard.wins": "{n} перемог",
  "minigames.blockdle.leaderboard.avg": "у середньому {n}",
  "minigames.blockdle.win.title": "Вгадано!",
  "minigames.blockdle.win.body": "За {n}/{max} спроб.",
  "minigames.blockdle.lose.title": "Спроби вичерпано",
  "minigames.blockdle.lose.body": "Відповідь — {name}.",
  "minigames.blockdle.reveal.label": "Відповідь",
  "minigames.blockdle.share.button": "Поділитися",
  "minigames.blockdle.share.copied": "Скопійовано",
  "minigames.blockdle.daily.cta.endless": "Грати без кінця →",
  "minigames.blockdle.daily.cta.tomorrow": "Завтра буде новий блок",
  "minigames.blockdle.endless.cta.next": "Наступний блок →",
  "minigames.blockdle.error.unknownBlock": "Такого блоку ми не знаємо.",
  "minigames.blockdle.error.duplicate": "Вже вгадували.",
  "minigames.blockdle.stat.wins": "Перемоги",
  "minigames.blockdle.stat.losses": "Поразки",

  "minigames.silence.name": "Тиша Scrap Mechanic",
  "minigames.silence.blurb":
    "Скільки часу минуло, відколи Axolot щось писали в стрічці новин Steam? Годинник іде.",
  "minigames.silence.title": "Скільки минуло від останньої новини про Scrap Mechanic",
  "minigames.silence.subtitle":
    "Живий лічильник читає офіційну стрічку новин Steam для Scrap Mechanic (appid 387990). Патч, анонс, нотатка розробника — щойно щось з'являється, таймер скидається.",
  "minigames.silence.months": "Місяців",
  "minigames.silence.days": "Днів",
  "minigames.silence.hours": "Годин",
  "minigames.silence.minutes": "Хвилин",
  "minigames.silence.seconds": "Секунд",
  "minigames.silence.totalSeconds": "Усього {n} секунд.",
  "minigames.silence.lastNewsLabel": "Остання новина",
  "minigames.silence.disclaimer":
    "«Місяць» тут — умовні 30 днів, вайб важливіший за календар. Дані оновлюються на сервері раз на 10 хвилин.",
  "minigames.silence.error":
    "Наразі не вдалося отримати стрічку новин Steam. Спробуйте за кілька хвилин.",

  "creation.backToNewest": "← До нових",
  "creation.by": "від",
  "creation.viewOnSteamWorkshop": "Відкрити у Майстерні Steam ↗",
  "creation.share": "Поділитися",
  "creation.shareAria": "Скопіювати посилання на цю роботу",
  "creation.shareCopied": "Посилання скопійовано в буфер обміну.",
  "creation.shareCopiedShort": "Скопійовано",
  "creation.shareFailed": "Не вдалося скопіювати посилання.",
  "creation.tagsHeading": "Теги",
  "creation.voteOnTagsHeading": "Голосувати за теги",
  "creation.communityAdded": "Додано спільнотою",
  "creation.submittedBy": "додав",
  "creation.descriptionHeading": "Опис",

  "banner.dismiss": "Сховати",

  "suggestions.title": "Дошка ідей",
  "suggestions.eyebrow": "Пропозиції функцій",
  "suggestions.subtitle":
    "Ідеї, які розглянув Автор сайту. Голосуйте за ті, що хочете побачити першими. Відхилені ідеї залишаються видимими — видно, що і чому не пройшло.",
  "suggestions.submitCta": "Запропонувати ідею",
  "suggestions.tab.approved": "Схвалено",
  "suggestions.tab.implemented": "Реалізовано",
  "suggestions.tab.rejected": "Відхилено",
  "suggestions.empty.approved": "На дошці ще немає схвалених ідей — запропонуйте першу.",
  "suggestions.empty.implemented":
    "Реалізованих ідей поки немає. Сюди потрапляють схвалені та випущені.",
  "suggestions.empty.rejected": "Відхилених ідей поки немає.",

  "suggestions.new.back": "← До дошки ідей",
  "suggestions.new.title": "Запропонувати функцію",
  "suggestions.new.subtitle":
    "Пропозиції спочатку приватно надходять Автору. Схвалені потрапляють на публічну дошку, де кожен може голосувати.",
  "suggestions.new.signInPrompt": "Увійдіть, щоб запропонувати ідею.",
  "suggestions.new.banned": "Ваш обліковий запис заблоковано — пропозиції вимкнено.",
  "suggestions.new.muted": "Вам встановлено мовчанку — пропозиції вимкнено.",
  "suggestions.new.titleLabel": "Короткий заголовок",
  "suggestions.new.titlePlaceholder": "напр. Перемикач темної теми на публічних сторінках",
  "suggestions.new.detailsLabel": "Подробиці (за бажанням)",
  "suggestions.new.detailsPlaceholder":
    "Чому це важливо, як ви це уявляєте, граничні випадки.",
  "suggestions.new.imageLabel": "Зображення (за бажанням)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF, до 500 КБ",
  "suggestions.new.imageHelper":
    "Макет, скриншот чи ескіз допоможе Авторові швидше зрозуміти запити щодо розташування, ніж слова.",
  "suggestions.new.send": "Надіслати Авторові",
  "suggestions.new.sending": "Надсилання…",
  "suggestions.new.thanks":
    "Дякуємо — Автор сайту це розгляне. Схвалені пропозиції з'являються на публічній дошці.",

  "submit.eyebrow": "Додавання об'єкта",
  "submit.title": "Запропонувати предмет з Майстерні",
  "submit.signedOut": "Щоб додати, потрібно увійти.",
  "submit.banned": "Ваш обліковий запис заблоковано — додавання вимкнено.",
  "submit.muted": "Вам встановлено мовчанку — додавання вимкнено.",
  "submit.tagsEnglishDisclaimer":
    "Назва та опис об'єкта можуть бути будь-якою мовою — сторінка Майстерні показується як є. Теги, що призначаються під час перевірки, лише англійською, щоб каталог залишався єдиним для всіх мов інтерфейсу.",

  "settings.eyebrow": "Налаштування",
  "settings.heading": "Ваші уподобання",
  "settings.intro":
    "Усі налаштування зберігаються у cookie браузера — обліковий запис не потрібен. Якщо очистити cookie, все повернеться до значень за замовчуванням.",
  "settings.language": "Мова",
  "settings.languageHint":
    "Перемикає підписи інтерфейсу. Об'єкти й теги зберігають свою мову — їх пишуть інші користувачі.",
  "settings.tagsDisclaimer":
    "Теги на сайті завжди англійською. Об'єкти (назви, описи) залишаються тією мовою, якою їх написав автор.",
  "settings.theme": "Тема",
  "settings.themeHint": "Як виглядає весь сайт.",
  "settings.themeCurrently": "Зараз: {name}. Хочете свою палітру?",
  "settings.customizeTheme": "Налаштувати свою тему →",
  "settings.ratings": "Оцінки",
  "settings.ratingsHint":
    "Яку оцінку показувати на картках — глобальний голос Steam, голос сайту чи обидва?",
  "settings.account": "Ваш обліковий запис",
  "settings.accountHint": "Все, що пов'язано з вашим акаунтом Steam.",
  "settings.profileLink": "Ваш публічний профіль →",
  "settings.favouritesLink": "Ваші обрані →",
  "settings.submissionsLink": "Ваші заявки →",
  "settings.notificationsLink": "Ваші сповіщення →",
  "settings.helpInfo": "Довідка та інформація",
  "settings.helpHint": "Хочете освіжити, як працює сайт?",
  "settings.quickGuide": "Короткий посібник →",
  "settings.ideasBoardLink": "Дошка ідей →",
  "settings.supportLink": "Підтримати сайт →",
  "settings.terms": "Умови",
  "settings.privacy": "Конфіденційність",

  "settings.funMode.title": "Веселий режим",
  "settings.funMode.hint":
    "Увімкніть частини сайту, що існують суто заради розваги — звуки банера розгортання, модераторські жарти з /admin/abuse на кшталт фейкового перезавантаження. Справжні попередження про розгортання все одно відображаються, коли режим вимкнено (вам все ж потрібно зберегти роботу перед перезавантаженням сайту), просто без звуку й без жартів.",
  "settings.funMode.off": "Вимк.",
  "settings.funMode.on": "Увімк.",
  "settings.funMode.offHint": "Без звуку, без жартів.",
  "settings.funMode.onHint": "Звуки і жарти увімкнено.",
  "settings.funMode.extremeTitle": "ЕКСТРЕМАЛЬНИЙ ВЕСЕЛИЙ РЕЖИМ.",
  "settings.funMode.extremeDescription":
    "Надбудова над Веселим режимом. Кожен клік породжує спрайт-хітмаркер і звук біля курсора (швидкі кліки можуть накладатися), а коли сигнал банера розгортання сягає нуля — на весь екран безшумно відтворюється відео ядерного вибуху, що закривається само по закінченні. Вимкнення Веселого режиму автоматично вимикає і цей.",
  "settings.funMode.extremeLabelOn": "ЕКСТРЕМАЛЬНІ ВЕСЕЛОЩІ — УВІМК.",
  "settings.funMode.extremeLabelOff": "ЕКСТРЕМАЛЬНІ ВЕСЕЛОЩІ — ВИМК.",
  "settings.funMode.extremeHintDisabled":
    "Спочатку увімкніть Веселий режим — ЕКСТРЕМАЛЬНОМУ потрібен базовий.",
  "settings.funMode.extremeHintOn":
    "Кліки породжують похилий хітмаркер + звук (можуть накладатися). Сигнал фейкового перезавантаження тепер запускає безшумне повноекранне відео ядерного вибуху. Вимкніть, якщо набридне.",
  "settings.funMode.extremeHintOff":
    "Увімкніть, щоб активувати ефекти кліків і відео ядерного вибуху на сигнал тривоги.",

  "error.title": "Щось пішло не так.",
  "error.body":
    "Сталася непередбачувана помилка під час завантаження сторінки. Спробуйте ще раз через хвилину.",
  "error.retry": "Спробувати ще",
  "globalError.title": "Щось пішло не так.",
  "globalError.body":
    "Критична помилка не дозволила завантажити сторінку. Спробуйте ще раз.",
  "globalError.retry": "Спробувати ще",
  "notFound.eyebrow": "404",
  "notFound.title": "Тут нічого немає.",
  "notFound.body":
    "Сторінки або об'єкта, який ви шукали, на сайті немає.",
  "notFound.home": "Повернутися на головну",
  "notFound.search": "Шукати об'єкт →",

  "footer.online": "{online} онлайн",
  "footer.signedInTotal": "всього {total} зареєстрованих",

  "support.metadataTitle": "Підтримати сайт",
  "support.metadataDescription":
    "Конкретні способи допомогти Scrap Mechanic Search Engine працювати та розвиватися — від поширення посилань до повідомлень про помилки.",
  "support.eyebrow": "Долучайтеся",
  "support.heading": "Як ви можете допомогти",
  "support.intro":
    "Зараз сайт працює на безкоштовних тарифах — цього вистачає, щоб він був у мережі, але не для того, щоб він зростав сам. Він лишається корисним завдяки таким людям, як ви. Ось усе, що справді має значення.",
  "support.spreadHeading": "Розкажіть іншим",
  "support.spreadP1":
    "Більшість людей, які шукають творіння для Scrap Mechanic, досі порпаються у вбудованому браузері Майстерні Steam. Розповісти другові, кинути посилання в Discord або поділитися творінням на Reddit — це беззаперечно найважливіше, що ви можете зробити.",
  "support.spreadP2Before": "На сторінці кожного творіння тепер є кнопка",
  "support.spreadP2ShareLabel": "Поділитися",
  "support.spreadP2Between": "поруч із",
  "support.spreadP2ViewLabel": "Відкрити у Steam Workshop",
  "support.spreadP2After": "— один клік копіює посилання.",
  "support.spreadP3Before": "Ще є",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "— вступ безкоштовний, а учасники отримують сповіщення у клієнті Steam, коли з'являються нові добірки.",
  "support.submitHeading": "Надсилайте пропущені творіння",
  "support.submitP1Before":
    "Автоматичний збір підхоплює лише трендові речі. Приховані перлини, які так і не стали вірусними, проскакують повз. Якщо у вас є така на прикметі — своя чи чужа — киньте посилання з Майстерні на",
  "support.submitP1Link": "/submit",
  "support.submitP1After": ". Модератор перевірить її, і вона з'явиться на сайті.",
  "support.voteHeading": "Голосуйте та ставте теги",
  "support.voteP1":
    "У кожного схваленого творіння є голоси «за»/«проти» та система тегів від спільноти. Що більше людей голосує, то краще працює сортування за рейтингом. Якщо творінню бракує тега, за яким ви б його шукали — додайте його. За +3 чистих голосів він стає видимим для всіх.",
  "support.reportHeading": "Повідомляйте про проблеми",
  "support.reportP1Before": "На сторінці кожного творіння є кнопка",
  "support.reportP1Label": "Поскаржитися",
  "support.reportP1After":
    ". Неправильні теги, низька якість, спам, відсутні співавтори — якщо щось не так, позначте це. Модератор розбереться, і каталог стане трохи кращим.",
  "support.reportP2": "Окремі коментарі теж можна надсилати на розгляд.",
  "support.suggestHeading": "Пропонуйте ідеї",
  "support.suggestP1Before":
    "Майже кожне вагоме покращення сайту з'явилося з ідеї користувача. Лишайте свої на",
  "support.suggestP1Link": "дошці ідей",
  "support.suggestP1After":
    "— це публічний список із голосуванням і розбором, а не чорна діра.",
  "support.bugsHeading": "Повідомляйте про баги",
  "support.bugsP1Before":
    "Знайшли щось зламане, потворне або незрозуміле? Напишіть на дошку ідей із тегом bug або відкрийте issue на",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": ". За підтверджені баг-звіти видають значок 🐛",
  "support.bugsP1BadgeLabel": "Мисливець за багами",
  "support.bugsP1BadgeAfter": ".",
  "support.moneyHeading": "Фінансова підтримка",
  "support.moneyP1":
    "Наразі пожертв немає — я ще не завів ані Patreon, ані Ko-fi, ані чогось подібного. Але якщо сайт зросте, рано чи пізно він упреться в ліміти безкоштовних тарифів, і тоді фінансова підтримка справді допомогла б тримати його в мережі та розвивати. Якщо захочете підтримати проєкт згодом — зазирайте, я додам сюди посилання, щойно все налаштую.",
  "support.moneyP2":
    "А поки що перелічене вище — найкорисніше, що ви можете зробити.",

  "about.metadataTitle": "Про проєкт · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "Як Scrap Mechanic Search Engine відбирає, завантажує та перевіряє творіння з Майстерні.",
  "about.eyebrow": "Як це працює",
  "about.heading": "Що це за сайт?",
  "about.shortVersion": "Якщо коротко",
  "about.shortVersionBody":
    "Вручну відібраний пошуковий каталог творінь із Майстерні Steam для Scrap Mechanic. Якість важливіша за кількість: кожен запис на публічному сайті пройшов перевірку модератором, а матеріали з низьким інтересом відсіюються ще до цієї перевірки.",
  "about.pipelineHeading": "Конвеєр",
  "about.step1Heading": "1. Автоматичне завантаження",
  "about.step1Body":
    "Щоденний cron отримує найновіші записи з Майстерні через Steam Web API. Записи, що не дотягують до порогу підписників і віку для свого типу, відсіюються — це не дає свіжим завантаженням без підписників і матеріалам з накрученими голосами потрапити до черги модерації.",
  "about.step1TableHeading": "Мінімальні пороги",
  "about.step1TableKind": "Тип",
  "about.step1TableMinSubs": "Мін. підписників",
  "about.step1TableMinAge": "Мін. вік",
  "about.step2Heading": "2. Перевірка людиною",
  "about.step2Body":
    "Усе, що проходить фільтр, потрапляє до черги модерації. Модератори схвалюють, відхиляють або запитують зміни. Схвалені записи отримують публічні теги та з'являються в каталозі; відхилені більше не потрапляють до майбутніх завантажень.",
  "about.step3Heading": "3. Подання від спільноти",
  "about.step3BodyBefore":
    "Будь-хто з підтвердженим обліковим записом Steam може вручну запропонувати матеріал через",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    ". Такі подання обходять фільтр за підписниками та віком, але проходять ту ж модерацію — вони позначаються, щоб модератори могли надати їм пріоритет.",
  "about.whatIfHeading": "Що, якщо мого творіння немає на сайті?",
  "about.whatIfBody":
    "Якщо творіння немає на сайті, майже завжди це тому, що воно нижче порогу автоматичного завантаження і його ще ніхто не запропонував вручну. Надішліть його через /submit — це займає десять секунд, і модератор зазвичай розглядає заявку за день-два.",
  "about.costHeading": "Витрати та стабільність",
  "about.costBody":
    "Весь стек працює на безкоштовних тарифах — Vercel Hobby для хостингу, Neon Postgres для бази даних, публічний Steam Web API для даних. Жодних платних сервісів, реклами чи трекерів, окрім базової серверної аналітики. Якщо хочете допомогти зберегти це, зазирніть на сторінку /support.",
  "about.thresholdsDays": "{n} дн.",

  "terms.metadataTitle": "Умови",
  "terms.metadataDescription":
    "Правила користування сайтом та публікації матеріалів.",
  "terms.heading": "Умови користування",
  "terms.lastUpdated": "Останнє оновлення — квітень 2026 р.",
  "terms.h2What": "Що це за сайт",
  "terms.pWhat":
    "Scrap Mechanic Search Engine — це безкоштовний каталог, який веде спільнота та який містить посилання на творіння Steam Workshop для гри Scrap Mechanic. Ми не пов'язані з Axolot Games чи Valve. Самі файли Workshop розміщено у Steam; ми зберігаємо лише метадані (назву, опис, теги, URL мініатюри) і посилаємося на першоджерело.",
  "terms.h2Account": "Обліковий запис",
  "terms.pAccount1":
    "Вхід відбувається через Steam OpenID — ми ніколи не бачимо вашого пароля Steam. Входячи, ви погоджуєтеся з цими умовами та нашою ",
  "terms.pAccountLink": "політикою конфіденційності",
  "terms.pAccount2":
    ". Ви несете відповідальність за безпеку власного облікового запису Steam.",
  "terms.h2Rules": "Правила спільноти",
  "terms.pRulesIntro":
    "Публікуючи коментарі, теги, пропозиції чи заявки:",
  "terms.liRulesDecent":
    "Поводьтеся гідно. Жодних переслідувань, образ чи погроз.",
  "terms.liRulesSpam": "Жодного спаму, реклами чи офтопу.",
  "terms.liRulesAppid":
    "Надсилайте лише творіння Workshop для Scrap Mechanic (appid 387990). Заявки щодо інших ігор відхиляються автоматично.",
  "terms.liRulesPii": "Не публікуйте особисту інформацію інших людей.",
  "terms.liRulesExploit":
    "Не намагайтеся зламати, здолати методом brute-force чи експлуатувати вразливості сайту.",
  "terms.pRulesMods":
    "Модератори можуть приховувати матеріали, виносити попередження, вимикати доступ до чату або блокувати облікові записи, що порушують ці правила. За серйозні або повторювані порушення може бути призначено постійне блокування.",
  "terms.h2Content": "Ваш контент",
  "terms.pContent":
    "Опубліковані вами коментарі та пропозиції залишаються підписаними вашим persona-ім'ям і можуть зберігатися у вигляді гілок обговорення навіть після того, як ви залишите сайт, щоб розпочаті дискусії залишалися зрозумілими. Права на все написане залишаються за вами; публікуючи матеріал, ви надаєте сайту невиключне право показувати його іншим користувачам.",
  "terms.h2Takedowns": "Контент Workshop та запити на видалення",
  "terms.pTakedowns1":
    "Самі файли й зображення кожного творіння Workshop розміщено на Steam. Якщо ваше творіння Workshop зазначене тут і ви хочете його прибрати (наприклад, ви зняли його з публікації у Steam), відкрийте issue у ",
  "terms.pTakedownsLink": "репозиторії GitHub",
  "terms.pTakedowns2":
    " проєкту або зверніться до модератора — і ми його приберемо.",
  "terms.h2Warranty": "Відсутність гарантій",
  "terms.pWarranty":
    "Сайт надається «як є». Функції можуть змінюватися чи зникати, сайт може бути недоступний, дані можуть містити помилки. Не покладайтеся на нього у важливих справах.",
  "terms.h2Changes": "Зміни",
  "terms.pChanges":
    "Ми можемо оновлювати ці умови. Про суттєві зміни буде повідомлено у примітках до випусків. Продовження користування сайтом після змін означає вашу згоду з оновленою версією.",

  "privacy.metadataTitle": "Конфіденційність",
  "privacy.metadataDescription":
    "Що ми збираємо, навіщо та як довго зберігаємо.",
  "privacy.h1": "Конфіденційність",
  "privacy.lastUpdated": "Останнє оновлення: квітень 2026 року.",
  "privacy.h2Short": "Коротко",
  "privacy.pShort":
    "Це некомерційний каталог творінь Scrap Mechanic Workshop, який веде спільнота. Ми не продаємо дані, не показуємо реклами та не використовуємо аналітичних трекерів, що стежать за вами. Якщо ви ніколи не ввійдете в систему, ми ніколи не дізнаємося, хто ви.",
  "privacy.h2Store": "Що ми зберігаємо",
  "privacy.pStoreIntro": "Якщо ви входите через Steam, ми зберігаємо:",
  "privacy.liStoreId": "Ваш публічний SteamID, ім'я профілю та URL аватара.",
  "privacy.liStoreAge":
    "Вік вашого облікового запису Steam і час гри у Scrap Mechanic — ці дані надходять зі Steam і використовуються для відсіювання щойно створених одноразових облікових записів.",
  "privacy.liStoreActivity":
    "Час, коли ви входили, залишали коментарі, голосували, додавали до обраного або надсилали матеріали, — щоб модератори могли підтримувати читабельність сайту.",
  "privacy.pStoreNot":
    "Ми <strong>не</strong> збираємо вашу електронну пошту, пароль, номер телефону, справжнє ім'я, IP-адресу чи історію переглядів.",
  "privacy.h2Cookies": "Cookie-файли",
  "privacy.liCookieSession":
    "<code>smse_session</code> — сесія входу, завершується після тижня неактивності.",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code> — короткочасний стан (30 хв) для перевірки на бота.",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code> — встановлюється після успішної перевірки, діє 30 днів.",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code> — запам'ятовує, чи надаєте ви перевагу оцінкам Steam, оцінкам сайту або обом.",
  "privacy.liCookieTheme":
    "<code>smse_theme</code> — запам'ятовує обрану вами колірну тему.",
  "privacy.pCookieFooter":
    "Усі cookie-файли є власними, підписаними та позначеними HTTP-only там, де це важливо. Жодних рекламних трекерів.",
  "privacy.h2Where": "Де зберігаються дані",
  "privacy.liWhereDb": "База даних: Neon (безсерверний Postgres, безкоштовний тариф).",
  "privacy.liWhereHost": "Хостинг: Vercel.",
  "privacy.liWhereSteam": "Метадані та мініатюри Workshop: Steam (пряме посилання).",
  "privacy.pWhereLogs":
    "Vercel і Neon можуть зберігати короткочасні операційні журнали. Ми не розміщуємо у записах журналу персональних даних понад необхідне для виправлення помилок.",
  "privacy.h2Controls": "Ваші інструменти контролю",
  "privacy.liControlsStop":
    "Припиніть користуватися сайтом у будь-який час — відвідувачі без входу не залишають жодних ідентифікаційних даних.",
  "privacy.liControlsDeletePre":
    "Попросіть видалити дані вашого облікового запису, створивши issue на ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    " проєкту. Ваш розміщений вміст (коментарі, пропозиції) може бути анонімізовано, а не видалено, щоб зберегти читабельність обговорень.",
  "privacy.h2Changes": "Зміни",
  "privacy.pChanges":
    "Якщо цю політику буде суттєво змінено, оновлення буде оголошено в примітках до випуску сайту. Ця сторінка завжди показує найновішу версію.",

  "locale.picker.label": "Мова",
};

const zh: Dictionary = {
  "nav.newest": "最新",
  "nav.browse": "浏览",
  "nav.search": "搜索",
  "nav.creators": "创作者",
  "nav.ideas": "建议",
  "nav.whatsNew": "更新内容",
  "nav.reviews": "游戏评测",
  "nav.submit": "提交",
  "nav.signIn": "使用 Steam 登录",
  "nav.settings": "设置",
  "nav.minigames": "小游戏与其他",
  "nav.adminTriage": "Admin triage",
  "nav.about": "关于本站",
  "nav.guide": "如何使用本站",
  "nav.support": "支持本站",
  "nav.favourites": "你的收藏",
  "nav.notifications": "通知",
  "nav.submissions": "你的提交",

  "kind.blueprints": "蓝图",
  "kind.mods": "模组",
  "kind.worlds": "世界",
  "kind.challenges": "挑战",
  "kind.tiles": "地块",
  "kind.customGames": "自定义游戏",
  "kind.terrain": "地形",
  "kind.other": "其他",

  "kind.blueprint": "蓝图",
  "kind.mod": "模组",
  "kind.world": "世界",
  "kind.challenge": "挑战",
  "kind.tile": "地块",
  "kind.customGame": "自定义游戏",
  "kind.terrainAsset": "地形",
  "kind.creationFallback": "作品",

  "rss.title": "Scrap Mechanic Search Engine — 最新",
  "rss.description":
    "Scrap Mechanic Search Engine 上最新已批准的 Scrap Mechanic 创意工坊作品。",
  "rss.by": "作者:",

  "submit.metadataTitle": "提交作品 — Scrap Mechanic Search Engine",
  "submit.metadataDescription":
    "提交一个 cron 尚未找到的 Scrap Mechanic 创意工坊作品。批准后将在公开动态中显示并带有 Community 标识。",
  "submit.introBefore":
    "有 cron 还没找到的宝藏作品？提交任意 Steam 创意工坊链接或 ID — 管理员审核后会在公开动态中出现,并带有",
  "submit.introCommunityBadge": "Community",
  "submit.introAfter": "标识。",
  "submit.privateProfileTitle": "无法验证你的 Steam 账号年龄。",
  "submit.privateProfileBody":
    "你的 Steam 个人资料是私密的,因此账号创建日期被隐藏。请将个人资料设为公开并重新登录 — 或向管理员提交简短申诉,他们会手动解除限制。",
  "submit.privateProfileAppeal": "申诉年龄限制 →",
  "submit.tooYoungTitle": "你的 Steam 账号不足 7 天。",
  "submit.tooYoungBody":
    "这是硬编码的冷却期,防止新的小号账户刷屏。对于「过新」的情况,管理员无法绕过 — 你只能等待。",
  "submit.tooYoungBodyStrong": "管理员无法绕过",
  "submit.tooYoungClearsOn": "你的账号将在 {date} 通过限制。届时再来。",
  "submit.acceptedForms": "支持的格式",
  "submit.queueExplain":
    "提交的内容将进入管理员审核队列。批准后公开显示;cron 不会重复获取。",
  "submit.curious": "想知道什么会被收录,为什么?",
  "submit.howItWorks": "工作原理",
  "submit.form.urlLabel": "Steam 创意工坊链接或 published-file ID",
  "submit.form.urlPlaceholder":
    "https://steamcommunity.com/sharedfiles/filedetails/?id=...",
  "submit.form.submitPending": "提交中…",
  "submit.form.submitButton": "提交审核",
  "submit.form.successToast": "已提交 — 管理员很快会审核。",
  "submit.form.errorToast": "提交失败。请重试或检查链接。",
  "submit.form.queuedToast": "{title} 已加入审核队列。",
  "submit.form.pendingBefore": "谢谢 —",
  "submit.form.pendingAfter": "正在等待管理员审核。",
  "submit.form.backHome": "返回首页 ↗",

  "home.heroTitle": "从创意工坊中发现精华。",
  "home.supportCalloutBefore":
    "想帮助这个项目继续成长?请前往",
  "home.supportCalloutLink": "支持本站",
  "home.supportCalloutAfter": ",查看你可以具体做些什么。",
  "home.descriptionBefore":
    "人工精选的蓝图、模组、世界等。组合标签,如",
  "home.descriptionExample1": "房子 + 汽车",
  "home.descriptionBetween": "找到可驾驶房车,或",
  "home.descriptionExample2": "行走 + 机甲",
  "home.descriptionAfter": "找六足机器人。低质量作品会被过滤掉。",
  "home.indexedOne": "已收录 {count} 件作品",
  "home.indexedMany": "已收录 {count} 件作品",
  "home.emptyState": "尚无通过审核的作品。启动收录并审核队列。",
  "home.popularBlueprints": "热门蓝图",
  "home.popularMods": "热门模组",
  "home.popularWorlds": "热门世界",
  "home.popularChallenges": "热门挑战",
  "home.newestHeading": "最新收录",
  "home.browseHeading": "浏览目录",
  "home.viewAll": "查看全部 →",
  "compare.heading": "对比",
  "compare.subheading": "对比 {count} 个作品",
  "compare.field": "字段",
  "compare.fieldKind": "类型",
  "compare.fieldAuthor": "作者",
  "compare.fieldSubs": "订阅数",
  "compare.fieldFavorites": "收藏",
  "compare.fieldRating": "评分",
  "compare.fieldSiteNet": "本站净票",
  "compare.fieldOnSteam": "Steam 创建时间",
  "compare.fieldOnSite": "本站审核时间",
  "compare.fieldTags": "标签",
  "compare.fieldLinks": "链接",
  "compare.openOnSite": "打开 ↗",
  "compare.add": "对比",
  "compare.inBasket": "已加入",
  "compare.added": "已加入对比清单",
  "compare.removed": "已从对比清单移除",
  "compare.replacedOldest": "清单已满 — 已替换最旧的一项",
  "compare.addAria": "把这个作品加入对比清单",
  "compare.removeAria": "把这个作品从对比清单移除",
  "compare.basketLabel": "已加入 {count}",
  "compare.basketHint": "再加一个",
  "compare.openButton": "对比 →",
  "compare.clearAria": "清空对比清单",
  "compare.emptyHelp": "在任意作品页将至少 2 个作品加入对比清单。",
  "compare.needTwo": "再加入一个作品以进行对比。",
  "compare.browseLink": "浏览作品",
  "home.surpriseMe": "随机推荐",
  "home.surpriseMeHint": "跳转到一个随机作品",
  "author.totalCreations": "作品总数",
  "author.totalSubs": "订阅者总数",
  "author.kindBreakdown": "按类型",
  "author.topCreation": "最热作品",
  "rss.titleByAuthor": "{name} 的最新作品",
  "rss.descriptionByAuthor": "来自 {name} 的最新已审核 Scrap Mechanic 创意工坊作品。",
  "rss.titleByTag": "标签 #{tag} 最新",
  "rss.descriptionByTag": "标签 #{tag} 的最新已审核 Scrap Mechanic 创意工坊作品。",
  "home.forYouHeading": "为你推荐",
  "home.forYouHint": "根据你的收藏与投票精选",
  "home.trendingHeading": "热门",
  "home.trendingHint": "全站精选",
  "profile.recentComments": "最近评论",
  "profile.commentOnWall": "在 {name} 的留言板上",
  "profile.commentDeleted": "[已删除]",
  "profile.commentDeletedTarget": "[目标已删除]",
  "home.noItems": "暂无已批准的作品。",

  "common.loading": "加载中…",
  "common.save": "保存",
  "common.cancel": "取消",
  "common.delete": "删除",
  "common.back": "返回",
  "common.remove": "移除",
  "common.close": "关闭",
  "common.signOut": "退出登录",
  "common.search": "搜索",
  "common.clear": "清除",
  "common.more": "更多 →",
  "common.newer": "← 更新",
  "common.older": "更早 →",
  "common.page": "第 {n} 页",
  "common.submit": "提交",

  "newest.title": "最新收录",
  "newest.subtitle": "来自所有创意工坊类别的最近批准作品。",

  "creators.title": "创作者",
  "creators.subtitle":
    "按上站作品数量排序的创意工坊作者。合作作品会记入所有署名者。",
  "creators.searchPlaceholder": "按名称搜索…",
  "creators.searchAria": "按名称搜索创作者",
  "creators.noMatch": "未找到匹配「{q}」的创作者。",
  "creators.empty": "暂无创作者。",
  "creators.creationCountOne": "{count} 件作品",
  "creators.creationCountMany": "{count} 件作品",
  "creators.unknownName": "（未知）",
  "creators.filterAll": "全部类型",
  "creators.filterAria": "按类型筛选创作者",

  "search.title": "搜索",
  "search.placeholder": "搜索标题与描述…",
  "search.noResults": "没有符合筛选条件的已批准作品。",

  "me.favourites.title": "你的收藏",
  "me.favourites.empty": "还没有收藏。",
  "me.submissions.title": "你的提交",
  "me.submissions.empty": "你还没有提交任何内容。",
  "me.notifications.title": "你的通知",
  "me.notifications.empty": "暂无通知。",
  "me.notifications.markAllRead": "全部标为已读",

  "card.communityBadge": "社区",
  "card.unratedLabel": "未评分",
  "card.viewOnSteam": "在 Steam 中查看",

  "minigames.eyebrow": "休息室",
  "minigames.title": "小游戏与其他",
  "minigames.subtitle":
    "站内的 Scrap Mechanic 主题小消遣,外加一些其他小东西。做好一个就上一个。",
  "minigames.playLabel": "开始",
  "minigames.othersLabel": "其他",
  "minigames.gamesHeading": "游戏",
  "minigames.othersHeading": "其他",
  "minigames.comingSoon": "敬请期待",
  "minigames.backToIndex": "← 返回小游戏",
  "minigames.reset": "重置",
  "minigames.statsLabel": "本次统计",
  "minigames.stat.streak": "连胜",
  "minigames.stat.bestStreak": "最佳",
  "minigames.stat.rounds": "回合",
  "minigames.stat.accuracy": "正确率",
  "minigames.whoIsThis": "这是谁?",
  "minigames.zoomAria": "点击放大图像",
  "minigames.zoomHint": "点击放大",
  "minigames.zoomDialogLabel": "已放大的角色图像",
  "minigames.wrongReset": "答错了 — 连胜已重置。",
  "minigames.roundWon": "回合胜利!下一回合…",
  "minigames.scrapcha.name": "Scrapcha",
  "minigames.scrapcha.blurb":
    "从截图中识别 Scrap Mechanic 角色。和登录验证码相同的谜题,但永不结束 — 你能连胜多久?",
  "minigames.scrapcha.subtitle":
    "选出截图中的角色。答错一次就重置连胜 — 能坚持到哪一轮?",
  "minigames.blockdle.name": "Blockdle",
  "minigames.blockdle.blurb":
    "近乎不可能的 Scrap Mechanic 方块猜谜。九项线索,十次尝试,500+ 方块。",
  "minigames.blockdle.subtitle":
    "猜出这个方块。属性会提示你距离答案有多近 — 绿色表示匹配,箭头指向正确方向。",
  "minigames.blockdle.mode.daily": "每日",
  "minigames.blockdle.mode.endless": "无尽",
  "minigames.blockdle.inputPlaceholder": "输入方块名称…",
  "minigames.blockdle.submit": "猜测",
  "minigames.blockdle.attemptsRemaining": "还剩 {n} 次",
  "minigames.blockdle.col.icon": "图标",
  "minigames.blockdle.col.name": "名称",
  "minigames.blockdle.col.inventoryType": "类型",
  "minigames.blockdle.col.category": "类别",
  "minigames.blockdle.col.material": "材质",
  "minigames.blockdle.col.flammable": "可燃",
  "minigames.blockdle.col.level": "等级",
  "minigames.blockdle.col.durability": "耐久",
  "minigames.blockdle.col.density": "密度",
  "minigames.blockdle.col.friction": "摩擦",
  "minigames.blockdle.col.buoyancy": "浮力",
  "minigames.blockdle.flammable.yes": "是",
  "minigames.blockdle.flammable.no": "否",
  "minigames.blockdle.level.none": "✗",
  "minigames.blockdle.leaderboard.title": "今日排行榜",
  "minigames.blockdle.leaderboard.subtitle":
    "已登录的赢家,用时最少者居前。每日 UTC 零点重置。",
  "minigames.blockdle.leaderboard.count": "{n} 人完成",
  "minigames.blockdle.leaderboard.empty": "今天还没人完成 — 来当第一个!",
  "minigames.blockdle.leaderboard.guesses": "{n} 次",
  "minigames.blockdle.leaderboard.allTimeTitle": "历代冠军",
  "minigames.blockdle.leaderboard.allTimeSubtitle":
    "所有曾攻克每日谜题的玩家。按胜场排序,同分者按平均用时少者居前。",
  "minigames.blockdle.leaderboard.allTimeEmpty": "还没有人攻克任何每日谜题。",
  "minigames.blockdle.leaderboard.wins": "{n} 胜",
  "minigames.blockdle.leaderboard.avg": "平均 {n} 次",
  "minigames.blockdle.win.title": "猜中了!",
  "minigames.blockdle.win.body": "用了 {n}/{max} 次。",
  "minigames.blockdle.lose.title": "次数用完",
  "minigames.blockdle.lose.body": "答案是 {name}。",
  "minigames.blockdle.reveal.label": "答案",
  "minigames.blockdle.share.button": "分享结果",
  "minigames.blockdle.share.copied": "已复制到剪贴板",
  "minigames.blockdle.daily.cta.endless": "玩无尽模式 →",
  "minigames.blockdle.daily.cta.tomorrow": "明天再来挑战新方块",
  "minigames.blockdle.endless.cta.next": "下一个方块 →",
  "minigames.blockdle.error.unknownBlock": "我们不认识这个方块。",
  "minigames.blockdle.error.duplicate": "已经猜过了。",
  "minigames.blockdle.stat.wins": "胜",
  "minigames.blockdle.stat.losses": "负",

  "minigames.silence.name": "Scrap Mechanic 沉默计时",
  "minigames.silence.blurb":
    "距 Axolot 上次在 Steam 新闻中发帖已经多久了?计时器正在走。",
  "minigames.silence.title": "距上一条 Scrap Mechanic 新闻已过多久",
  "minigames.silence.subtitle":
    "实时计数器,读取 Scrap Mechanic(appid 387990)的官方 Steam 新闻流。补丁、公告、开发者日志 — 只要有新内容,计时就归零。",
  "minigames.silence.months": "月",
  "minigames.silence.days": "天",
  "minigames.silence.hours": "时",
  "minigames.silence.minutes": "分",
  "minigames.silence.seconds": "秒",
  "minigames.silence.totalSeconds": "共 {n} 秒。",
  "minigames.silence.lastNewsLabel": "最新新闻",
  "minigames.silence.disclaimer":
    "这里的「月」是按 30 天估的 — 感觉比精确日历更重要。服务器数据每 10 分钟刷新一次。",
  "minigames.silence.error":
    "目前无法获取 Steam 新闻流,请稍后几分钟再试。",

  "creation.backToNewest": "← 返回最新",
  "creation.by": "作者:",
  "creation.viewOnSteamWorkshop": "在 Steam 创意工坊查看 ↗",
  "creation.share": "分享",
  "creation.shareAria": "复制此作品的链接",
  "creation.shareCopied": "链接已复制到剪贴板。",
  "creation.shareCopiedShort": "已复制",
  "creation.shareFailed": "无法复制链接。",
  "creation.tagsHeading": "标签",
  "creation.voteOnTagsHeading": "为标签投票",
  "creation.communityAdded": "社区添加",
  "creation.submittedBy": "提交者:",
  "creation.descriptionHeading": "描述",

  "banner.dismiss": "隐藏",

  "suggestions.title": "建议板",
  "suggestions.eyebrow": "功能建议",
  "suggestions.subtitle":
    "由站主审阅过的想法。给你希望先看到的想法点赞。被否决的想法也保留可见,方便你了解什么没过,以及为什么。",
  "suggestions.submitCta": "提交建议",
  "suggestions.tab.approved": "已批准",
  "suggestions.tab.implemented": "已实现",
  "suggestions.tab.rejected": "已否决",
  "suggestions.empty.approved": "板上还没有已批准的想法 — 来提一个吧。",
  "suggestions.empty.implemented":
    "还没有已实现的想法。已批准并上线的想法会出现在这里。",
  "suggestions.empty.rejected": "还没有被否决的想法。",

  "suggestions.new.back": "← 返回建议板",
  "suggestions.new.title": "提议一个功能",
  "suggestions.new.subtitle":
    "建议会先私下发给站主。被批准的会出现在公开板上,所有人都可以点赞。",
  "suggestions.new.signInPrompt": "请先登录以提交建议。",
  "suggestions.new.banned": "你的账号已被封禁 — 建议提交已禁用。",
  "suggestions.new.muted": "你目前处于禁言状态 — 建议提交已禁用。",
  "suggestions.new.titleLabel": "简短标题",
  "suggestions.new.titlePlaceholder": "例如:公开页面的深色模式切换",
  "suggestions.new.detailsLabel": "详情(可选)",
  "suggestions.new.detailsPlaceholder":
    "为什么重要、你希望如何实现、有哪些边界情况。",
  "suggestions.new.imageLabel": "图片(可选)",
  "suggestions.new.imageHint": "PNG/JPEG/WEBP/GIF,最大 500 KB",
  "suggestions.new.imageHelper":
    "一张草图、截图或示意图比单靠文字更能让站主快速理解布局方面的想法。",
  "suggestions.new.send": "发送给站主",
  "suggestions.new.sending": "发送中…",
  "suggestions.new.thanks":
    "感谢 — 站主会查看。被批准的建议会出现在公开板上。",

  "submit.eyebrow": "提交作品",
  "submit.title": "推荐一个创意工坊条目",
  "submit.signedOut": "需要先登录才能提交。",
  "submit.banned": "你的账号已被封禁 — 提交已禁用。",
  "submit.muted": "你目前处于禁言状态 — 提交已禁用。",
  "submit.tagsEnglishDisclaimer":
    "你提交条目的标题与描述可以使用任何语言 — 创意工坊页面按原样显示。审核时附加的标签一律为英文,以便目录在所有界面语言下保持一致。",

  "settings.eyebrow": "设置",
  "settings.heading": "你的偏好",
  "settings.intro":
    "这里的每项设置都存储在浏览器 Cookie 中 — 无需账号。清除 Cookie 后会恢复默认值。",
  "settings.language": "语言",
  "settings.languageHint":
    "切换界面标签。作品与标签保留原始语言 — 它们由其他用户撰写。",
  "settings.tagsDisclaimer":
    "全站标签始终为英文。作品(标题、描述)保留作者撰写时的语言。",
  "settings.theme": "主题",
  "settings.themeHint": "整站的外观。",
  "settings.themeCurrently": "当前:{name}。想要自定义配色?",
  "settings.customizeTheme": "自定义主题 →",
  "settings.ratings": "评分",
  "settings.ratingsHint":
    "希望在每张卡片上看到哪种评分 — Steam 全局投票、站内投票,或两者都显示?",
  "settings.account": "你的账号",
  "settings.accountHint": "与你的 Steam 账号相关的内容。",
  "settings.profileLink": "你的公开资料 →",
  "settings.favouritesLink": "你的收藏 →",
  "settings.submissionsLink": "你的提交 →",
  "settings.notificationsLink": "你的通知 →",
  "settings.helpInfo": "帮助与说明",
  "settings.helpHint": "想了解站点如何运作?",
  "settings.quickGuide": "快速指南 →",
  "settings.ideasBoardLink": "建议板 →",
  "settings.supportLink": "支持本站 →",
  "settings.terms": "条款",
  "settings.privacy": "隐私",

  "settings.funMode.title": "趣味模式",
  "settings.funMode.hint":
    "加入纯属娱乐的部分 — 部署横幅音效、来自 /admin/abuse 的管理员恶作剧（如假重启）。关闭趣味模式后仍会显示真实的部署警告（你仍需在站点重启前保存工作），只是静音且没有恶作剧。",
  "settings.funMode.off": "关",
  "settings.funMode.on": "开",
  "settings.funMode.offHint": "静音,没有恶作剧。",
  "settings.funMode.onHint": "声音 + 恶作剧已开启。",
  "settings.funMode.extremeTitle": "极致趣味模式。",
  "settings.funMode.extremeDescription":
    "叠加在趣味模式之上。每次点击都会在光标处生成一个命中标记精灵并播放音效（快速点击时可重叠），当部署横幅的警报归零时,一个静音全屏核爆视频会播放几秒钟后自动关闭。关闭趣味模式将级联关闭此项。",
  "settings.funMode.extremeLabelOn": "极致趣味 — 开",
  "settings.funMode.extremeLabelOff": "极致趣味 — 关",
  "settings.funMode.extremeHintDisabled":
    "请先开启趣味模式 — 极致需要趣味模式作为前提。",
  "settings.funMode.extremeHintOn":
    "点击会生成倾斜的命中标记和声音（可重叠）。假重启警报现在触发静音全屏核爆视频。若觉得烦人可关闭。",
  "settings.funMode.extremeHintOff":
    "开启它以启用点击效果和警报触发的核爆视频。",

  "error.title": "出了点问题。",
  "error.body": "加载此页面时遇到意外错误。请稍后重试。",
  "error.retry": "重试",
  "globalError.title": "出了点问题。",
  "globalError.body": "致命错误导致页面无法加载。请重试。",
  "globalError.retry": "重试",
  "notFound.eyebrow": "404",
  "notFound.title": "这里什么都没有。",
  "notFound.body": "你要找的页面或作品不在本站。",
  "notFound.home": "返回首页",
  "notFound.search": "搜索作品 →",

  "footer.online": "{online} 在线",
  "footer.signedInTotal": "共 {total} 位已登录用户",

  "support.metadataTitle": "支持本站",
  "support.metadataDescription":
    "你可以通过哪些具体方式帮助 Scrap Mechanic Search Engine 持续运行并不断发展——从分享链接到反馈 bug。",
  "support.eyebrow": "参与进来",
  "support.heading": "你可以怎样帮忙",
  "support.intro":
    "目前本站运行在免费额度上——这能让它保持在线,但无法自行成长。它之所以仍然有用,是因为像你这样的人愿意出一份力。下面列出的就是真正能起作用的事情。",
  "support.spreadHeading": "广而告之",
  "support.spreadP1":
    "大多数寻找 Scrap Mechanic 作品的人仍然在 Steam 自带的创意工坊浏览器里翻找。告诉朋友、在 Discord 里贴个链接,或者把某个作品分享到 Reddit——这是你能做的影响最大的一件事。",
  "support.spreadP2Before": "现在每个作品页面旁边都有一个",
  "support.spreadP2ShareLabel": "分享",
  "support.spreadP2Between": "按钮,紧挨着",
  "support.spreadP2ViewLabel": "在 Steam Workshop 查看",
  "support.spreadP2After": "——一键复制链接。",
  "support.spreadP3Before": "还有一个",
  "support.spreadP3SteamGroup": "Steam Group",
  "support.spreadP3After":
    "——免费加入,成员在 Steam 客户端里会收到新推荐发布时的通知。",
  "support.submitHeading": "提交我们遗漏的作品",
  "support.submitP1Before":
    "自动抓取只会收录热门作品。那些从未走红的隐藏佳作会被漏掉。如果你心里有这样一个作品——你自己的或别人的——请把创意工坊链接发到",
  "support.submitP1Link": "/submit",
  "support.submitP1After": "。版主审核后就会上线。",
  "support.voteHeading": "投票与打标签",
  "support.voteP1":
    "每个通过审核的作品都有顶/踩投票和社区标签系统。参与投票的人越多,评分排序就越准确。如果某个作品缺少你会搜索的标签——加上去。净票数达到 +3 时,它就会对所有人可见。",
  "support.reportHeading": "反馈问题",
  "support.reportP1Before": "每个作品页面都有一个",
  "support.reportP1Label": "举报",
  "support.reportP1After":
    "按钮。标签错误、质量低劣、垃圾内容、遗漏合作者——只要有问题,就标记出来。版主会处理,目录也会因此变得更好一点。",
  "support.reportP2": "单条评论也可以举报。",
  "support.suggestHeading": "提建议",
  "support.suggestP1Before":
    "本站几乎每一项有意义的改进都源自用户的想法。把你的想法发到",
  "support.suggestP1Link": "想法看板",
  "support.suggestP1After":
    "——那是一个公开、投票、分类整理的列表,不是黑洞。",
  "support.bugsHeading": "反馈 bug",
  "support.bugsP1Before":
    "发现了坏掉的、难看的或令人困惑的东西?在想法看板上用 bug 标签发帖,或者到",
  "support.bugsP1GitHub": "GitHub",
  "support.bugsP1After": "上开一个 issue。经核实的 bug 报告可以获得 🐛",
  "support.bugsP1BadgeLabel": "Bug 猎人",
  "support.bugsP1BadgeAfter": "徽章。",
  "support.moneyHeading": "资金支持",
  "support.moneyP1":
    "目前还没有捐赠渠道——我还没搭建 Patreon、Ko-fi 之类的东西。但如果本站发展起来,迟早会超出免费额度的范围,到那时财务支持会真正帮助它保持在线并持续改进。如果你希望日后以这种方式支持——请回来看看,等我搭好后会在这里加上链接。",
  "support.moneyP2":
    "在此期间,以上这些事情就是你能做的最有用的事。",

  "about.metadataTitle": "关于 · Scrap Mechanic Search Engine",
  "about.metadataDescription":
    "Scrap Mechanic Search Engine 如何筛选、收录和审核创意工坊作品。",
  "about.eyebrow": "运作方式",
  "about.heading": "这是什么网站?",
  "about.shortVersion": "简而言之",
  "about.shortVersionBody":
    "一个人工精选、可搜索的 Scrap Mechanic Steam 创意工坊作品目录。质量优先于数量:公开站点上的每一项作品都经过人工审核,低关注度作品在进入审核前就已被过滤。",
  "about.pipelineHeading": "处理流程",
  "about.step1Heading": "1. 自动收录",
  "about.step1Body":
    "每日 cron 任务通过 Steam Web API 获取最新的创意工坊作品。低于各类型订阅数和发布时长阈值的作品会被过滤掉——这样可以避免刚上传的零订阅作品和刷票作品进入审核队列。",
  "about.step1TableHeading": "最低阈值",
  "about.step1TableKind": "类型",
  "about.step1TableMinSubs": "最少订阅数",
  "about.step1TableMinAge": "最短时长",
  "about.step2Heading": "2. 人工审核",
  "about.step2Body":
    "通过筛选的作品会进入版主审核队列。版主会批准、拒绝或要求修改。通过的作品会获得公开标签并出现在目录中;被拒绝的作品不会再出现在后续收录中。",
  "about.step3Heading": "3. 社区提交",
  "about.step3BodyBefore":
    "任何拥有已验证 Steam 账户的用户都可以手动提交作品,通过",
  "about.step3Submit": "/submit",
  "about.step3BodyAfter":
    "。这类提交会绕过订阅数/时长过滤,但仍需经过相同的版主审核——社区提交会被标记,以便版主优先处理。",
  "about.whatIfHeading": "如果我的作品没有出现怎么办?",
  "about.whatIfBody":
    "如果某个作品不在站点上,几乎总是因为它低于自动收录阈值且还没有人手动提交。请在 /submit 提交——只需十秒,版主通常会在一两天内审核。",
  "about.costHeading": "成本与可持续性",
  "about.costBody":
    "整个技术栈都运行在免费套餐上——Vercel Hobby 负责托管,Neon Postgres 作为数据库,Steam 公开 Web API 提供数据。没有付费服务、没有广告,除了基本的服务器分析外也没有任何追踪器。如果你想帮助维持这一点,请查看 /support 页面。",
  "about.thresholdsDays": "{n} 天",

  "terms.metadataTitle": "使用条款",
  "terms.metadataDescription": "使用本站及发布内容的规则。",
  "terms.heading": "使用条款",
  "terms.lastUpdated": "最后更新于 2026 年 4 月。",
  "terms.h2What": "本站简介",
  "terms.pWhat":
    "Scrap Mechanic Search Engine 是一个免费的、由社区运营的目录,汇集了指向游戏 Scrap Mechanic 的 Steam Workshop 创作的链接。我们与 Axolot Games 或 Valve 没有任何关联。Workshop 作品本身托管在 Steam 上;我们仅存储元数据(标题、简介、标签、缩略图 URL)并提供回链。",
  "terms.h2Account": "账号",
  "terms.pAccount1":
    "登录采用 Steam OpenID — 我们绝不会看到您的 Steam 密码。登录即表示您同意本条款以及我们的",
  "terms.pAccountLink": "隐私政策",
  "terms.pAccount2": "。您须自行负责保障 Steam 账号的安全。",
  "terms.h2Rules": "社区规则",
  "terms.pRulesIntro": "在发表评论、添加标签、提出建议或提交作品时:",
  "terms.liRulesDecent": "请保持基本礼貌。不得进行骚扰、辱骂或威胁。",
  "terms.liRulesSpam": "不得发布垃圾信息、广告或与主题无关的内容。",
  "terms.liRulesAppid":
    "只能提交面向 Scrap Mechanic(appid 387990)的 Workshop 作品。其他游戏的提交将被自动拒绝。",
  "terms.liRulesPii": "不得公开他人的个人信息。",
  "terms.liRulesExploit": "不得试图破坏、暴力破解或利用本站漏洞。",
  "terms.pRulesMods":
    "对于违反上述规则的账号,管理员可以隐藏其内容,或对其进行警告、禁言及封禁。严重或屡次违规可能导致永久封禁。",
  "terms.h2Content": "您的内容",
  "terms.pContent":
    "您发布的评论和建议将持续署名您的 persona 名称,即使您离开本站,也可能以线程形式保留,以便既有讨论仍能连贯阅读。您对自己所撰写的内容保留所有权;发布后,即授予本站以非独占方式向其他用户展示该内容的权利。",
  "terms.h2Takedowns": "Workshop 内容与下架请求",
  "terms.pTakedowns1":
    "每件 Workshop 作品的实际文件与图片均由 Steam 托管。如果您的 Workshop 作品出现在本站,而您希望将其下架(例如您已在 Steam 上取消发布),请在本项目的",
  "terms.pTakedownsLink": "GitHub 仓库",
  "terms.pTakedowns2": "中提交 issue,或联系管理员,我们会将其移除。",
  "terms.h2Warranty": "不提供任何保证",
  "terms.pWarranty":
    "本站以「现状」提供。功能可能变化或消失,站点可能宕机,数据可能存在错误。请勿将其用于任何重要用途。",
  "terms.h2Changes": "变更",
  "terms.pChanges":
    "我们可能更新本条款。重大变更将在发行说明中注明。变更后继续使用本站,即视为您接受更新后的版本。",

  "privacy.metadataTitle": "隐私",
  "privacy.metadataDescription": "我们收集什么、为何收集以及保留多久。",
  "privacy.h1": "隐私",
  "privacy.lastUpdated": "最后更新于 2026 年 4 月。",
  "privacy.h2Short": "简要版本",
  "privacy.pShort":
    "这是一个由社区运营、非商业性的 Scrap Mechanic Workshop 作品目录。我们不出售数据,不投放广告,也不使用跟踪您的分析工具。如果您从不登录,我们就永远不会知道您是谁。",
  "privacy.h2Store": "我们存储什么",
  "privacy.pStoreIntro": "如果您使用 Steam 登录,我们会保存:",
  "privacy.liStoreId": "您公开的 SteamID、人物名称和头像 URL。",
  "privacy.liStoreAge":
    "您的 Steam 账户年龄和 Scrap Mechanic 游戏时长——这些信息来自 Steam,用于过滤新创建的一次性账户。",
  "privacy.liStoreActivity":
    "您登录、评论、投票、收藏或提交内容的时间——以便版主保持站点的可读性。",
  "privacy.pStoreNot":
    "我们<strong>不会</strong>收集您的电子邮箱、密码、电话号码、真实姓名、IP 地址或浏览历史。",
  "privacy.h2Cookies": "cookie",
  "privacy.liCookieSession":
    "<code>smse_session</code>——登录会话,在不活动一周后过期。",
  "privacy.liCookieCaptcha":
    "<code>smse_captcha</code>——反机器人验证的短时状态(30 分钟)。",
  "privacy.liCookieBotVerified":
    "<code>bot_verified</code>——在您通过验证后设置,有效期 30 天。",
  "privacy.liCookieRatingMode":
    "<code>smse_rating_mode</code>——记住您偏好 Steam 评分、站点评分,或两者兼用。",
  "privacy.liCookieTheme":
    "<code>smse_theme</code>——记住您选择的颜色主题。",
  "privacy.pCookieFooter":
    "所有 cookie 均为第一方 cookie,在需要时经过签名或设为 HTTP-only。没有任何广告跟踪器。",
  "privacy.h2Where": "数据存放在哪里",
  "privacy.liWhereDb": "数据库:Neon(无服务器 Postgres,免费层)。",
  "privacy.liWhereHost": "托管:Vercel。",
  "privacy.liWhereSteam": "Workshop 元数据和缩略图:Steam(外链)。",
  "privacy.pWhereLogs":
    "Vercel 和 Neon 可能会保留短期的运行日志。除修复缺陷所必需之外,我们不会在日志信息中放入个人数据。",
  "privacy.h2Controls": "您的控制权",
  "privacy.liControlsStop":
    "随时停止使用本站——已登出的访客不会留下任何可识别身份的数据。",
  "privacy.liControlsDeletePre": "通过在项目的 ",
  "privacy.liControlsDeleteLink": "GitHub",
  "privacy.liControlsDeletePost":
    " 上创建 issue,申请删除您的账户数据。您发布的内容(评论、建议)可能会被匿名化而非删除,以保持讨论串的可读性。",
  "privacy.h2Changes": "变更",
  "privacy.pChanges":
    "如本政策发生重大变更,更新将在站点的发布说明中公告。本页面将始终显示最新版本。",

  "locale.picker.label": "语言",
};

const DICTS: Record<Locale, Dictionary> = { en, ru, uk, de, pl, zh };

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
