// Chapter 2 — the next major Scrap Mechanic chapter (the one that takes the
// game to 1.0). This drives the /minigames/chapter2 countdown.
//
// The release date is UNKNOWN as of 2026-07-02: Axolot has only teased
// ("Tomorrow.") without committing to a date. Devblog 26 said the date would
// be "announced in the coming months." So the countdown ships in a graceful
// "not announced yet" state and flips to a live timer the instant a date is
// set here.
//
// WHEN THE DATE IS ANNOUNCED: set `releaseUnix` to the release moment in Unix
// seconds (UTC) and redeploy. That's the only change needed — the page and
// the landing card react automatically. Leave it null while unannounced.
//
//   Convert a date to Unix seconds, e.g. in a shell:
//     date -u -d '2026-08-15 15:00:00' +%s
//
// Source to watch for the announcement: https://x.com/ScrapMechanic

export interface Chapter2Release {
  /** Unix seconds (UTC) of the announced release, or null if not announced. */
  releaseUnix: number | null;
  /** Where the date was announced (shown once a date is set). */
  sourceUrl: string;
  /** Human label for the source link. */
  sourceLabel: string;
}

export const CHAPTER2: Chapter2Release = {
  releaseUnix: null,
  sourceUrl: "https://x.com/ScrapMechanic",
  sourceLabel: "@ScrapMechanic on X",
};
