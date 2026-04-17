import { z } from "zod";

export const SCRAP_MECHANIC_APPID = 387990;
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
    preview_url: z.string().url().optional(),
    title: z.string().optional().default(""),
    short_description: z.string().optional().default(""),
    file_description: z.string().optional().default(""),
    time_created: z.number().optional(),
    time_updated: z.number().optional(),
    visibility: z.number().optional(),
    banned: looseBool.optional(),
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
  params.set("return_short_description", "true");
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

export function detectKind(steamTags: string[]): SteamKind | "other" {
  const lowered = new Set(steamTags.map((t) => t.toLowerCase()));
  for (const [kind, tag] of Object.entries(STEAM_KIND_TAGS) as [SteamKind, string][]) {
    if (lowered.has(tag.toLowerCase())) return kind;
  }
  return "other";
}
