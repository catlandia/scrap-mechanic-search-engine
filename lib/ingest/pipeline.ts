import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  creationCategories,
  creationTags,
  creations,
  ingestRuns,
  tags as tagsTable,
  type NewCreation,
} from "@/lib/db/schema";
import { stripBBCode } from "@/lib/steam/bbcode";
import {
  detectKind,
  fetchWorkshopContributors,
  pickFullDescription,
  QUERY_TYPE,
  queryFiles,
  resolvePlayerNames,
  STEAM_KIND_TAGS,
  steamUrlFor,
  type PublishedFile,
  type SteamKind,
} from "@/lib/steam/client";
import { classify } from "@/lib/tagger/classify";
import { thresholdsForKind } from "./thresholds";

export type IngestOrder = "trend" | "new";

export interface IngestOptions {
  kinds?: SteamKind[];
  /** Maximum pages fetched per kind — the hard ceiling. */
  pagesPerKind?: number;
  /** Page size passed to Steam; defaults to 50 which is the API max. */
  numPerPage?: number;
  /**
   * Once this many genuinely new (not already in DB) items have been
   * collected for a given kind, stop paging that kind even if we haven't
   * hit `pagesPerKind`. 0 = no early stop (scan to the ceiling — what
   * manual admin runs want when they're deliberately digging deep).
   *
   * Daily cron passes a non-zero value so pages filled entirely with
   * already-decided items don't silently burn the new-items budget —
   * we keep digging deeper until the page yields fresh discoveries.
   */
  minNewPerKind?: number;
  /**
   * Which Steam ranking to page through. `trend` (default) is the current
   * Workshop "best / trending" list; `new` is RankedByPublicationDate, the
   * newest-first list. The pipeline skips already-decided items in either
   * mode — so `new` keeps paging past stale top-of-new entries until fresh
   * rows are found.
   */
  order?: IngestOrder;
}

export interface IngestResult {
  runId: number;
  fetched: number;
  newItems: number;
  updatedItems: number;
  filtered: number;
  tagRowsInserted: number;
  errors: { kind?: string; message: string }[];
}

export const ALL_KINDS: SteamKind[] = [
  "blueprint",
  "mod",
  "world",
  "challenge",
  "tile",
  "custom_game",
  "terrain_asset",
];

interface CollectedItem {
  item: PublishedFile;
  kind: string;
  descriptionClean: string;
}

function toDate(unixSeconds: number | undefined): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

function ageDays(unixSeconds: number | undefined): number {
  if (!unixSeconds) return 0;
  return (Date.now() / 1000 - unixSeconds) / 86400;
}

function passesFollowGate(item: PublishedFile, kind: string): boolean {
  const { minSubscriptions, minAgeDays } = thresholdsForKind(kind);
  const subs = item.lifetime_subscriptions ?? item.subscriptions ?? 0;
  if (subs < minSubscriptions) return false;
  if (ageDays(item.time_created) < minAgeDays) return false;
  if (item.banned) return false;
  return true;
}

function buildRow(
  collected: CollectedItem,
  authorName: string | null,
  creators: Array<{ steamid: string; name: string }> = [],
): NewCreation {
  const { item, kind, descriptionClean } = collected;
  const tagNames = (item.tags ?? []).map((t) => t.tag);
  return {
    id: item.publishedfileid,
    title: item.title || "(untitled)",
    descriptionRaw: pickFullDescription(item),
    descriptionClean,
    authorSteamid: item.creator ?? null,
    authorName,
    creators,
    thumbnailUrl: item.preview_url ?? null,
    steamUrl: steamUrlFor(item.publishedfileid),
    fileSizeBytes:
      typeof item.file_size === "string"
        ? Number(item.file_size) || null
        : (item.file_size ?? null),
    timeCreated: toDate(item.time_created),
    timeUpdated: toDate(item.time_updated),
    voteScore: item.vote_data?.score ?? null,
    votesUp: item.vote_data?.votes_up ?? null,
    votesDown: item.vote_data?.votes_down ?? null,
    subscriptions: item.lifetime_subscriptions ?? item.subscriptions ?? 0,
    favorites: item.lifetime_favorited ?? item.favorited ?? 0,
    views: item.views ?? 0,
    steamTags: tagNames,
    kind,
  };
}

/**
 * Run `fn` across `items` with at most `limit` concurrent in-flight promises.
 * Used to scrape Steam HTML pages for contributors without flooding their CDN.
 */
async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestResult> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY is not set");

  const db = getDb();
  const kinds = options.kinds ?? ALL_KINDS;
  // Hard ceiling on pages fetched per kind. Cron now gets a generous ceiling
  // because the early-stop logic below keeps us from actually fetching them
  // unless needed — the ceiling only kicks in when the Workshop has a lot
  // of already-decided items stacked at the top.
  const pagesPerKind = options.pagesPerKind ?? 5;
  const numPerPage = options.numPerPage ?? 50;
  // 0 = no early stop (scan to the page ceiling). Both cron and manual runs
  // now opt into a non-zero target so already-decided top-of-list items
  // don't silently eat the page budget.
  const minNewPerKind = options.minNewPerKind ?? 0;
  const queryType =
    options.order === "new"
      ? QUERY_TYPE.RankedByPublicationDate
      : QUERY_TYPE.RankedByTrend;

  // Preload ids of items we've already approved, rejected, or creator-deleted
  // so ingest skips them completely — both the QueryFiles processing and the
  // later upsert. 'deleted' is the permanent blocklist: once the Creator
  // removes something it never comes back via ingest. Pending items still
  // refresh (their stats may have changed).
  const decidedRows = await db
    .select({ id: creations.id })
    .from(creations)
    .where(
      inArray(creations.status, [
        "approved",
        "rejected",
        "archived",
        "deleted",
      ]),
    );
  const alreadyDecided = new Set(decidedRows.map((r) => r.id));

  // Pending items are allowed through the loop so they get a fresh stats
  // update, but they shouldn't count as "new discoveries" for the
  // early-stop threshold — they were already pulled in on a previous run.
  const pendingRows = await db
    .select({ id: creations.id })
    .from(creations)
    .where(eq(creations.status, "pending"));
  const alreadyKnown = new Set(pendingRows.map((r) => r.id));

  const [run] = await db
    .insert(ingestRuns)
    .values({
      startedAt: new Date(),
      fetched: 0,
      newItems: 0,
      progress: {
        kindsDone: 0,
        kindsTotal: kinds.length,
        currentKind: null,
        pageInCurrentKind: 0,
        pagesPerKind,
      },
    })
    .returning();

  // Cheap best-effort progress writer. Failures here are non-fatal — if
  // the admin's progress bar occasionally stalls because one update
  // dropped, the run still completes and the final counts are correct.
  async function writeProgress(partial: {
    kindsDone: number;
    currentKind: string | null;
    pageInCurrentKind: number;
  }) {
    try {
      await db
        .update(ingestRuns)
        .set({
          progress: {
            kindsDone: partial.kindsDone,
            kindsTotal: kinds.length,
            currentKind: partial.currentKind,
            pageInCurrentKind: partial.pageInCurrentKind,
            pagesPerKind,
          },
        })
        .where(eq(ingestRuns.id, run.id));
    } catch {
      // Swallow — progress tracking is a UX hint, not a correctness signal.
    }
  }

  const errors: IngestResult["errors"] = [];
  let totalFetched = 0;
  let totalFiltered = 0;
  let tagRowsInserted = 0;
  const collected: CollectedItem[] = [];

  let kindsDone = 0;
  for (const kind of kinds) {
    const requiredTag = STEAM_KIND_TAGS[kind];
    let cursor = "*";
    // Items already in the DB (as "pending" — the only status that escapes
    // `alreadyDecided`) don't count as new discoveries even though they pass
    // the filters, because they were already pulled in on a previous run.
    // We track fresh-for-us insert candidates per-kind so early-stop is
    // driven by real new work, not re-surfaced pending items.
    let novelForKind = 0;
    await writeProgress({
      kindsDone,
      currentKind: kind,
      pageInCurrentKind: 0,
    });
    try {
      for (let page = 0; page < pagesPerKind; page += 1) {
        await writeProgress({
          kindsDone,
          currentKind: kind,
          pageInCurrentKind: page + 1,
        });
        const { items, nextCursor } = await queryFiles({
          apiKey,
          requiredTags: [requiredTag],
          numPerPage,
          cursor,
          queryType,
        });
        totalFetched += items.length;
        for (const item of items) {
          if (alreadyDecided.has(item.publishedfileid)) {
            totalFiltered += 1;
            continue;
          }
          if (!passesFollowGate(item, kind)) {
            totalFiltered += 1;
            continue;
          }
          const detectedKind = detectKind((item.tags ?? []).map((t) => t.tag));
          const descRaw = pickFullDescription(item);
          collected.push({
            item,
            kind: detectedKind,
            descriptionClean: stripBBCode(descRaw),
          });
          // Only truly novel items (never seen, not even as pending) count
          // toward the early-stop threshold. An already-pending item passes
          // the filters and refreshes its stats but doesn't consume the new
          // quota the user complained about.
          if (!alreadyKnown.has(item.publishedfileid)) {
            novelForKind += 1;
          }
        }
        if (!nextCursor || nextCursor === cursor) break;
        cursor = nextCursor;
        // Early-stop: once we've pulled enough novel items for this kind,
        // don't burn more Steam API calls paging through the rest of the
        // trending list. A manual admin run passes minNewPerKind=0 to
        // disable this.
        if (minNewPerKind > 0 && novelForKind >= minNewPerKind) break;
      }
    } catch (err) {
      errors.push({ kind, message: err instanceof Error ? err.message : String(err) });
    }
    kindsDone += 1;
    await writeProgress({
      kindsDone,
      currentKind: null,
      pageInCurrentKind: 0,
    });
  }

  // De-dupe: a single publishedfileid could appear under multiple kind queries.
  const byId = new Map<string, CollectedItem>();
  for (const c of collected) byId.set(c.item.publishedfileid, c);
  const uniqueCollected = Array.from(byId.values());

  let nameMap = new Map<string, string>();
  if (uniqueCollected.length > 0) {
    try {
      const authorIds = uniqueCollected
        .map((c) => c.item.creator)
        .filter((id): id is string => Boolean(id));
      nameMap = await resolvePlayerNames(apiKey, authorIds);
    } catch (err) {
      errors.push({
        message: `resolvePlayerNames: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  const allIds = uniqueCollected.map((c) => c.item.publishedfileid);
  const existingRows =
    allIds.length > 0
      ? await db
          .select({ id: creations.id })
          .from(creations)
          .where(inArray(creations.id, allIds))
      : [];
  const existingIds = new Set(existingRows.map((r) => r.id));

  const toInsert: CollectedItem[] = [];
  const toUpdate: CollectedItem[] = [];
  for (const c of uniqueCollected) {
    (existingIds.has(c.item.publishedfileid) ? toUpdate : toInsert).push(c);
  }

  if (toInsert.length > 0) {
    // Scrape multi-creator attribution from the rendered Workshop page —
    // Steam's API only exposes the primary creator. Cap concurrency so we
    // don't hammer steamcommunity.com; best-effort per item.
    const contributorsByItem = await parallelLimit(
      toInsert,
      3,
      async (c) => {
        try {
          const result = await fetchWorkshopContributors(
            apiKey,
            c.item.publishedfileid,
          );
          return result.ok ? result.contributors : [];
        } catch {
          return [];
        }
      },
    );
    const rows = toInsert.map((c, i) =>
      buildRow(
        c,
        (c.item.creator && nameMap.get(c.item.creator)) ?? null,
        contributorsByItem[i] ?? [],
      ),
    );
    try {
      await db.insert(creations).values(rows);
    } catch (err) {
      errors.push({
        message: `bulk insert: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  for (const c of toUpdate) {
    const row = buildRow(c, (c.item.creator && nameMap.get(c.item.creator)) ?? null);
    try {
      await db
        .update(creations)
        .set({
          title: row.title,
          descriptionRaw: row.descriptionRaw,
          descriptionClean: row.descriptionClean,
          authorName: row.authorName,
          thumbnailUrl: row.thumbnailUrl,
          timeUpdated: row.timeUpdated,
          voteScore: row.voteScore,
          votesUp: row.votesUp,
          votesDown: row.votesDown,
          subscriptions: row.subscriptions,
          favorites: row.favorites,
          views: row.views,
          steamTags: row.steamTags,
          kind: row.kind,
        })
        .where(eq(creations.id, c.item.publishedfileid));
    } catch (err) {
      errors.push({
        message: `update ${c.item.publishedfileid}: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  // Tagger — run only on newly inserted rows so admin confirmations survive.
  // Collect all tag/category rows into single batched inserts to minimise
  // roundtrips (Hobby plan's 60s function limit is the binding constraint).
  if (toInsert.length > 0) {
    const allTags = await db
      .select({ id: tagsTable.id, slug: tagsTable.slug, categoryId: tagsTable.categoryId })
      .from(tagsTable);
    const tagBySlug = new Map(allTags.map((t) => [t.slug, t]));

    const batchedTagRows: typeof creationTags.$inferInsert[] = [];
    const batchedCategoryRows: typeof creationCategories.$inferInsert[] = [];

    for (const c of toInsert) {
      const suggestions = classify({
        title: c.item.title ?? "",
        descriptionClean: c.descriptionClean,
        steamTags: (c.item.tags ?? []).map((t) => t.tag),
      });
      if (suggestions.length === 0) continue;

      const categoryIdSet = new Set<number>();
      for (const s of suggestions) {
        const tag = tagBySlug.get(s.slug);
        if (!tag) continue;
        batchedTagRows.push({
          creationId: c.item.publishedfileid,
          tagId: tag.id,
          source: s.source,
          confidence: s.confidence,
          confirmed: false,
        });
        if (tag.categoryId) categoryIdSet.add(tag.categoryId);
      }
      for (const cid of categoryIdSet) {
        batchedCategoryRows.push({
          creationId: c.item.publishedfileid,
          categoryId: cid,
        });
      }
    }

    if (batchedTagRows.length > 0) {
      try {
        await db.insert(creationTags).values(batchedTagRows).onConflictDoNothing();
        tagRowsInserted = batchedTagRows.length;
      } catch (err) {
        errors.push({
          message: `batch insert creation_tags: ${err instanceof Error ? err.message : err}`,
        });
      }
    }
    if (batchedCategoryRows.length > 0) {
      try {
        await db
          .insert(creationCategories)
          .values(batchedCategoryRows)
          .onConflictDoNothing();
      } catch (err) {
        errors.push({
          message: `batch insert creation_categories: ${err instanceof Error ? err.message : err}`,
        });
      }
    }
  }

  await db
    .update(ingestRuns)
    .set({
      endedAt: new Date(),
      fetched: totalFetched,
      newItems: toInsert.length,
      errors: errors as unknown[],
    })
    .where(eq(ingestRuns.id, run.id));

  return {
    runId: run.id,
    fetched: totalFetched,
    newItems: toInsert.length,
    updatedItems: toUpdate.length,
    filtered: totalFiltered,
    tagRowsInserted,
    errors,
  };
}
