// Chapter 2 — the next major Scrap Mechanic chapter (the one that takes the
// game to 1.0). This drives the /minigames/chapter2 countdown.
//
// ANNOUNCED 2026-07-03: Axolot dropped a Release Date Trailer setting Chapter 2
// for 2026-07-24. No clock time was given — the trailer shows only the date —
// so we anchor the countdown to 18:00 CEST (16:00 UTC), a sane evening-release
// placeholder that still reads as "24 Jul" on the info card and won't flip to
// the "released" state prematurely. If Axolot later states an exact time,
// update `releaseUnix` and redeploy — that's the only change needed.
//
//   Announcement:          https://x.com/ScrapMechanic/status/2073056918940025049
//   Release Date Trailer:  https://www.youtube.com/watch?v=cnweUJ8rDNA
//
//   Convert a date to Unix seconds, e.g. in a shell:
//     date -u -d '2026-07-24 16:00:00' +%s   # -> 1784908800

export interface Chapter2Release {
  /** Unix seconds (UTC) of the announced release, or null if not announced. */
  releaseUnix: number | null;
  /** Where the date was announced (shown once a date is set). */
  sourceUrl: string;
  /** Human label for the source link. */
  sourceLabel: string;
}

export const CHAPTER2: Chapter2Release = {
  releaseUnix: 1784908800, // 2026-07-24 18:00 CEST (16:00 UTC)
  sourceUrl: "https://x.com/ScrapMechanic/status/2073056918940025049",
  sourceLabel: "@ScrapMechanic on X",
};
