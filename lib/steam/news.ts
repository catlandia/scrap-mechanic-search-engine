import "server-only";
import { SCRAP_MECHANIC_APPID } from "./client";

// Valve's public news endpoint — no API key required. `count=1` because we
// only ever want the freshest row, `maxlength=0` strips the body so we're
// pulling ~1 KB of metadata instead of the full announcement HTML.
const NEWS_URL =
  `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/` +
  `?appid=${SCRAP_MECHANIC_APPID}&count=1&maxlength=0&format=json`;

export interface LatestNews {
  /** Unix seconds of the latest news item's publish date. */
  date: number;
  title: string;
  url: string;
  feedlabel: string;
}

/**
 * Returns the most recent Scrap Mechanic Steam news item, or null if
 * Steam's news endpoint is unreachable / returns no items.
 *
 * Cached for 10 minutes at the Next.js fetch layer — the counter UI ticks
 * locally in the browser, so we only need a fresh server read once in a
 * while to catch new announcements. Also caps Steam API burn if the page
 * goes viral.
 */
export async function getLatestScrapMechanicNews(): Promise<LatestNews | null> {
  try {
    const res = await fetch(NEWS_URL, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      appnews?: {
        newsitems?: Array<{
          date?: number;
          title?: string;
          url?: string;
          feedlabel?: string;
        }>;
      };
    };
    const first = data?.appnews?.newsitems?.[0];
    if (!first || typeof first.date !== "number") return null;
    return {
      date: first.date,
      title: first.title ?? "(untitled)",
      url: first.url ?? `https://store.steampowered.com/app/${SCRAP_MECHANIC_APPID}/`,
      feedlabel: first.feedlabel ?? "Steam news",
    };
  } catch (err) {
    console.error("[steam/news] GetNewsForApp failed:", err);
    return null;
  }
}
