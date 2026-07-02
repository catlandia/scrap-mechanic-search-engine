import "server-only";

// Axolot's official account. The "silence" minigame is about how long it's
// been since the devs *actually communicated* with the community — and their
// real channel is X, not the Steam feed. (Steam picks up the occasional
// security hotfix that never gets tweeted; those don't count as breaking the
// silence.) X has no free API and its public timeline is login-gated, so the
// latest post is pinned here by hand.
//
// WHEN @ScrapMechanic POSTS AGAIN: bump the three fields in LATEST_TWEET to
// the new tweet (date = the tweet's Unix seconds, decode it from the status
// id if needed) and redeploy. Source of truth:
//   https://x.com/ScrapMechanic
export const SCRAP_MECHANIC_X_HANDLE = "ScrapMechanic";

export interface LatestTweet {
  /** Unix seconds the tweet was posted. */
  date: number;
  title: string;
  url: string;
  feedlabel: string;
}

// "Tomorrow." — a Chapter 2 teaser (GIF) posted 2026-07-02 14:44:33 UTC,
// breaking a ~6-month silence since Devblog 26. This is the most recent
// @ScrapMechanic post. Status id 2072692912983355469 decodes to that time.
const LATEST_TWEET: LatestTweet = {
  date: 1783003473,
  title: "Tomorrow.",
  url: "https://x.com/ScrapMechanic/status/2072692912983355469",
  feedlabel: "X · @ScrapMechanic",
};

/** The most recent known post from @ScrapMechanic on X. */
export function getLatestScrapMechanicTweet(): LatestTweet {
  return LATEST_TWEET;
}
