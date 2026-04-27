import { z } from "zod";

export const SCRAP_MECHANIC_APPID = 387990;
/**
 * Scrap Mechanic workshop items carry one of two Steam appids depending on
 * which tool published them:
 *   387990 — the base Scrap Mechanic game (blueprints, worlds, tiles, terrain)
 *   588870 — Scrap Mechanic Workshop (custom games, mods distributed via the
 *            separate "Scrap Mechanic Workshop" tool)
 * Legitimate SM items may have either. We accept both on submission.
 */
export const SCRAP_MECHANIC_APPIDS: readonly number[] = [387990, 588870];
const STEAM_BASE = "https://api.steampowered.com";

export const STEAM_KIND_TAGS = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge Pack",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain Assets",
} as const;

export type SteamKind = keyof typeof STEAM_KIND_TAGS;

// IPublishedFileService QueryFiles query types
// https://partner.steamgames.com/doc/webapi/IPublishedFileService
export const QUERY_TYPE = {
  RankedByVote: 0,
  RankedByPublicationDate: 1,
  RankedByTrend: 3,
  RankedByTotalUniqueSubscriptions: 9,
  RankedByTextSearch: 12,
  RankedByLastUpdatedDate: 21,
} as const;

// Steam's two endpoints return booleans differently:
// - QueryFiles:                `banned: true/false`
// - GetPublishedFileDetails:   `banned: 1/0`
// Accept either and normalise.
const looseBool = z
  .union([z.boolean(), z.number()])
  .transform((v) => (typeof v === "number" ? v !== 0 : v));

const PublishedFileSchema = z
  .object({
    publishedfileid: z.string(),
    result: z.number().optional(),
    creator: z.string().optional(),
    filename: z.string().optional(),
    file_size: z.union([z.string(), z.number()]).optional(),
    // Steam occasionally returns an empty string or non-URL value here
    // (seen on a few challenge items). The strict `.url()` check would
    // throw and lose every later item on that page — accept any string
    // and let the renderer naturally drop a broken `<img src>`.
    preview_url: z.string().optional(),
    title: z.string().optional().default(""),
    // Steam inconsistency: IPublishedFileService returns the long body in
    // `file_description` (if `return_short_description=false`) and the trimmed
    // body in `short_description`; ISteamRemoteStorage returns the long body
    // in a plain `description` field. Capture all three and let callers pick
    // the longest non-empty one.
    short_description: z.string().optional().default(""),
    file_description: z.string().optional().default(""),
    description: z.string().optional().default(""),
    time_created: z.number().optional(),
    time_updated: z.number().optional(),
    visibility: z.number().optional(),
    banned: looseBool.optional(),
    // ISteamRemoteStorage/GetPublishedFileDetails returns `creator_app_id`.
    // IPublishedFileService/QueryFiles returns `consumer_appid`. Normalise
    // both into the same field so callers can rely on a single source.
    consumer_appid: z.number().optional(),
    creator_app_id: z.number().optional(),
    subscriptions: z.number().optional(),
    favorited: z.number().optional(),
    lifetime_subscriptions: z.number().optional(),
    lifetime_favorited: z.number().optional(),
    views: z.number().optional(),
    tags: z
      .array(z.object({ tag: z.string(), display_name: z.string().optional() }))
      .optional()
      .default([]),
    vote_data: z
      .object({
        score: z.number().optional(),
        votes_up: z.number().optional(),
        votes_down: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export type PublishedFile = z.infer<typeof PublishedFileSchema>;

const QueryResponseSchema = z.object({
  response: z.object({
    total: z.number().optional(),
    next_cursor: z.string().optional(),
    publishedfiledetails: z.array(PublishedFileSchema).optional().default([]),
  }),
});

const DetailsResponseSchema = z.object({
  response: z.object({
    result: z.number().optional(),
    resultcount: z.number().optional(),
    publishedfiledetails: z.array(PublishedFileSchema).optional().default([]),
  }),
});

export interface QueryFilesArgs {
  apiKey: string;
  queryType?: number;
  requiredTags?: string[];
  numPerPage?: number;
  cursor?: string;
  search?: string;
  appid?: number;
}

export async function queryFiles(args: QueryFilesArgs): Promise<{
  items: PublishedFile[];
  nextCursor: string | null;
  total: number;
}> {
  const params = new URLSearchParams();
  params.set("key", args.apiKey);
  params.set("appid", String(args.appid ?? SCRAP_MECHANIC_APPID));
  params.set("query_type", String(args.queryType ?? QUERY_TYPE.RankedByTrend));
  params.set("numperpage", String(args.numPerPage ?? 50));
  params.set("cursor", args.cursor ?? "*");
  params.set("return_tags", "true");
  params.set("return_vote_data", "true");
  // `return_short_description=true` returns a truncated body in
  // `short_description` and leaves `file_description` empty. Flipping to
  // `false` gets us the full BBCode description in `file_description`,
  // which is what every render path actually wants. Payload gets larger
  // but the ingest cron already handles one page at a time so this is
  // well within the function budget.
  params.set("return_short_description", "false");
  params.set("return_details", "true");
  params.set("return_previews", "true");
  params.set("return_metadata", "true");
  if (args.search) params.set("search_text", args.search);
  if (args.requiredTags?.length) {
    args.requiredTags.forEach((tag, i) => params.append(`requiredtags[${i}]`, tag));
    params.set("match_all_tags", "true");
  }

  const url = `${STEAM_BASE}/IPublishedFileService/QueryFiles/v1/?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`QueryFiles failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  const parsed = QueryResponseSchema.parse(raw);
  return {
    items: parsed.response.publishedfiledetails ?? [],
    nextCursor: parsed.response.next_cursor ?? null,
    total: parsed.response.total ?? 0,
  };
}

export async function getPublishedFileDetails(
  publishedFileIds: string[],
): Promise<PublishedFile[]> {
  if (publishedFileIds.length === 0) return [];
  const body = new URLSearchParams();
  body.set("itemcount", String(publishedFileIds.length));
  publishedFileIds.forEach((id, i) => body.append(`publishedfileids[${i}]`, id));

  const res = await fetch(
    `${STEAM_BASE}/ISteamRemoteStorage/GetPublishedFileDetails/v1/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`GetPublishedFileDetails failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  const parsed = DetailsResponseSchema.parse(raw);
  return parsed.response.publishedfiledetails ?? [];
}

export async function resolvePlayerNames(
  apiKey: string,
  steamIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(steamIds.filter(Boolean)));
  const out = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const params = new URLSearchParams({ key: apiKey, steamids: batch.join(",") });
    const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v2/?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      response?: { players?: Array<{ steamid: string; personaname: string }> };
    };
    for (const p of json.response?.players ?? []) {
      out.set(p.steamid, p.personaname);
    }
  }
  return out;
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl?: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  avatarhash?: string;
  /** 1 = private, 3 = public */
  communityvisibilitystate?: number;
  profilestate?: number;
  /** Unix seconds when the Steam account was created. Only populated when the profile is public. */
  timecreated?: number;
  personastate?: number;
}

export async function getPlayerSummary(
  apiKey: string,
  steamid: string,
): Promise<SteamPlayerSummary | null> {
  const params = new URLSearchParams({ key: apiKey, steamids: steamid });
  const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v2/?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    response?: { players?: SteamPlayerSummary[] };
  };
  return json.response?.players?.[0] ?? null;
}

/**
 * Returns total Scrap Mechanic playtime in minutes, or null if the Steam
 * profile/game-details are private (user has to opt in on Steam to expose this).
 */
export async function getSmPlaytimeMinutes(
  apiKey: string,
  steamid: string,
): Promise<number | null> {
  const params = new URLSearchParams({
    key: apiKey,
    steamid,
    include_appinfo: "false",
    include_played_free_games: "1",
    "appids_filter[0]": String(SCRAP_MECHANIC_APPID),
  });
  const url = `${STEAM_BASE}/IPlayerService/GetOwnedGames/v1/?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    response?: {
      games?: Array<{ appid: number; playtime_forever?: number }>;
    };
  };
  const game = json.response?.games?.find((g) => g.appid === SCRAP_MECHANIC_APPID);
  return game?.playtime_forever ?? null;
}

export function steamUrlFor(publishedFileId: string): string {
  return `https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedFileId}`;
}

export type ContributorScrapeResult =
  | { ok: true; contributors: Array<{ steamid: string; name: string }> }
  | { ok: false; reason: "fetch" | "parse" };

/**
 * Steam's public API only returns a single `creator` per workshop item, but
 * the web UI renders every contributor in a `<div class="creatorsBlock">`
 * sidebar. Scrape it and return the full list, resolving vanity URLs to
 * numeric steamids via ResolveVanityURL.
 *
 * Returns a tagged result so callers can distinguish:
 *   - { ok: true, contributors: [...] } — scrape succeeded; [] means
 *     "solo-author item, no creatorsBlock" (still a clean success).
 *   - { ok: false, reason: "fetch" } — network / HTTP failure after retries.
 *   - { ok: false, reason: "parse" } — block found but no friendBlock
 *     entries parsed, i.e. Steam changed their HTML.
 *
 * Refresh-path callers should PRESERVE the previously stored `creators` on
 * `ok: false` rather than overwriting with [] — otherwise transient Steam
 * hiccups silently clobber real attribution and a weekly rotation can take
 * a month or more to heal. Insert-path callers have nothing to preserve
 * and can treat failure as empty.
 */
export async function fetchWorkshopContributors(
  apiKey: string,
  publishedFileId: string,
): Promise<ContributorScrapeResult> {
  const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedFileId}`;
  // Up to 3 attempts with jittered backoff on transient Steam hiccups.
  // Without this, the bulk backfill lost ~60% of rows to occasional
  // 5xx / aborts. Each extra retry is cheap relative to re-scraping the
  // whole catalog on a rotation.
  //
  // 429 special-case: Steam penalty-boxes bulk scrapers with HTTP 429
  // (Too Many Requests). Regular exponential backoff of a few hundred ms
  // isn't enough — the lockout lasts minutes. Honour `Retry-After` if it's
  // present and cap at 60 s so we don't hang a single row forever.
  let html: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SmseIngest/1.0; +https://scrap-mechanic-search-engine.vercel.app)",
        },
        cache: "no-store",
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 60_000)
          : 30_000 + Math.random() * 15_000;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        return { ok: false, reason: "fetch" };
      }
      if (!res.ok) throw new Error(`http_${res.status}`);
      html = await res.text();
      break;
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        continue;
      }
      return { ok: false, reason: "fetch" };
    }
  }
  if (!html) return { ok: false, reason: "fetch" };

  const start = html.indexOf('class="creatorsBlock"');
  // Solo-creator items don't render `creatorsBlock`. That's a clean success
  // with zero contributors — the `authorSteamid` column covers them.
  if (start < 0) return { ok: true, contributors: [] };

  // Slice to the end of the block so the regex can't run past unrelated
  // markup, and so very long blocks (lots of contributors) aren't truncated
  // at the previous 20 KB cap.
  const blockEnd = html.indexOf("</div>\r\n\t\t</div>", start);
  const slice = html.slice(start, blockEnd > start ? blockEnd : start + 40000);

  type Raw = { profileLink: string; name: string };
  const raws: Raw[] = [];
  // Each contributor = one friendBlock div with a persona suffix and an
  // <a class="friendBlockLinkOverlay" href="PROFILE_URL"> plus a <div
  // class="friendBlockContent">PERSONA<br>. Name char class is permissive
  // so unicode / quotes / punctuation in personas don't break the match.
  const blockRe = /class="friendBlock persona[^"]*"[\s\S]*?class="friendBlockLinkOverlay" href="([^"]+)"[\s\S]*?class="friendBlockContent">\s*([^<\n]+?)\s*(?:<br|<)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(slice)) !== null) {
    raws.push({ profileLink: m[1], name: m[2].trim() });
  }
  // Block was there but we parsed zero rows — Steam changed its markup.
  // Flag as parse failure so callers preserve prior state.
  if (raws.length === 0) return { ok: false, reason: "parse" };

  // Split numeric steamids from vanity URLs. Numeric go straight through;
  // vanities go through ResolveVanityURL.
  const resolved: Array<{ steamid: string; name: string }> = [];
  const toResolve: Array<{ vanity: string; name: string }> = [];
  for (const r of raws) {
    const numeric = /\/profiles\/(\d+)/.exec(r.profileLink);
    if (numeric) {
      resolved.push({ steamid: numeric[1], name: r.name });
      continue;
    }
    const vanity = /\/id\/([^/?#"]+)/.exec(r.profileLink);
    if (vanity) toResolve.push({ vanity: vanity[1], name: r.name });
  }
  for (const v of toResolve) {
    const sid = await resolveVanityUrl(apiKey, v.vanity);
    if (sid) resolved.push({ steamid: sid, name: v.name });
  }
  // De-dupe by steamid in case the HTML lists the same profile twice.
  const seen = new Set<string>();
  const contributors = resolved.filter((c) => {
    if (seen.has(c.steamid)) return false;
    seen.add(c.steamid);
    return true;
  });
  return { ok: true, contributors };
}

export async function resolveVanityUrl(
  apiKey: string,
  vanity: string,
): Promise<string | null> {
  const params = new URLSearchParams({ key: apiKey, vanityurl: vanity });
  const url = `${STEAM_BASE}/ISteamUser/ResolveVanityURL/v1/?${params.toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: { steamid?: string; success?: number };
    };
    if (json.response?.success === 1 && json.response.steamid) {
      return json.response.steamid;
    }
  } catch {
    // swallow — callers fall back to API's primary creator
  }
  return null;
}

/**
 * Steam's two workshop endpoints populate different description fields, and
 * `return_short_description` flips which one an IPublishedFileService row
 * carries. This helper hides the mess: picks the richest non-empty body it
 * can find, so callers don't have to remember which flag was set.
 */
export function pickFullDescription(item: {
  file_description?: string;
  description?: string;
  short_description?: string;
}): string {
  const candidates = [
    item.file_description ?? "",
    item.description ?? "",
    item.short_description ?? "",
  ];
  let best = "";
  for (const c of candidates) {
    if (c.length > best.length) best = c;
  }
  return best;
}

export function detectKind(steamTags: string[]): SteamKind | "other" {
  const lowered = new Set(steamTags.map((t) => t.toLowerCase()));
  for (const [kind, tag] of Object.entries(STEAM_KIND_TAGS) as [SteamKind, string][]) {
    if (lowered.has(tag.toLowerCase())) return kind;
  }
  // Items without a recognised kind tag used to land in "other", but nothing
  // a user actually wants lives there — it's almost always a miscategorised
  // mod. Default the fallback to "mod" so new items land somewhere a
  // visitor browses; the creator can still flip the kind from the creation
  // page if a specific item belongs elsewhere.
  return "mod";
}
