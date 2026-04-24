"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  comments,
  creationCategories,
  creationTags,
  creations,
  reports,
  tags,
  users,
} from "@/lib/db/schema";
import { runIngest } from "@/lib/ingest/pipeline";
import { CREATION_KINDS, ingestRuns, type IngestProgress } from "@/lib/db/schema";
import { getCurrentUser, isBanned } from "@/lib/auth/session";
import { effectiveRole, isModerator } from "@/lib/auth/roles";
import {
  detectKind,
  fetchWorkshopContributors,
  getPublishedFileDetails,
  pickFullDescription,
  resolvePlayerNames,
  steamUrlFor,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";
import { classify } from "@/lib/tagger/classify";
import { broadcastToRole, createNotification } from "@/lib/db/notifications";
import { AUTOGRANT_BADGES, BADGE_SLUGS, SYSTEM_AUTO_BADGES } from "@/lib/badges/definitions";
import { ENGLISH_TAG_ERROR, isEnglishTagName } from "@/lib/i18n/english-tag";
import {
  addAutogrant,
  grantBadge,
  removeAutogrant,
  revokeBadge,
} from "@/lib/badges/queries";
import { resolveVanityUrl } from "@/lib/steam/client";
import { logModAction } from "@/lib/audit/log";
import { refreshAllTopCreatorBadges } from "@/lib/badges/top-creator";

function parseKind(raw: FormDataEntryValue | null): string {
  const kind = String(raw ?? "other");
  return (CREATION_KINDS as readonly string[]).includes(kind) ? kind : "other";
}

function parseTagIds(fd: FormData): number[] {
  const raw = fd.getAll("tagIds") as FormDataEntryValue[];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n));
}

async function replaceTagsForCreation(creationId: string, tagIds: number[]) {
  const db = getDb();
  await db.delete(creationTags).where(eq(creationTags.creationId, creationId));
  if (tagIds.length > 0) {
    await db.insert(creationTags).values(
      tagIds.map((tagId) => ({
        creationId,
        tagId,
        source: "admin" as const,
        confirmed: true,
      })),
    );
  }

  await db
    .delete(creationCategories)
    .where(eq(creationCategories.creationId, creationId));

  if (tagIds.length > 0) {
    const tagRows = await db
      .select({ categoryId: tags.categoryId })
      .from(tags)
      .where(inArray(tags.id, tagIds));
    const categoryIds = Array.from(
      new Set(
        tagRows
          .map((r) => r.categoryId)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    );
    if (categoryIds.length > 0) {
      await db.insert(creationCategories).values(
        categoryIds.map((categoryId) => ({ creationId, categoryId })),
      );
    }
  }
}

export async function approveCreation(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const kind = parseKind(formData.get("kind"));
  const tagIds = parseTagIds(formData);

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  const now = new Date();
  const [updated] = await db
    .update(creations)
    .set({
      status: "approved",
      kind,
      reviewedAt: now,
      reviewedByUserId: actor.steamid,
      approvedAt: now,
      shortId: sql`COALESCE(${creations.shortId}, nextval(pg_get_serial_sequence('creations', 'short_id'))::integer)`,
    })
    .where(eq(creations.id, id))
    .returning({ shortId: creations.shortId });

  await replaceTagsForCreation(id, tagIds);

  if (row?.uploadedByUserId) {
    await createNotification({
      userId: row.uploadedByUserId,
      type: "submission_approved",
      title: "Submission approved!",
      body: `"${row.title}" is now live on the site.`,
      link: `/creation/${updated?.shortId ?? id}`,
    });
  }

  await logModAction({
    actor,
    action: "creation.approve",
    targetType: "creation",
    targetId: id,
    summary: `Approved "${row?.title ?? id}" (${kind})`,
    metadata: { kind, tagCount: tagIds.length, community: !!row?.uploadedByUserId },
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function rejectCreation(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  // Community-submitted rejections require a reason — the submitter put in
  // the effort to flag the item, so a silent rejection feels dismissive.
  // The client wraps reject in a reason-prompt for these rows; the server
  // check is defensive-in-depth for anyone calling the action directly.
  if (row?.uploadedByUserId && !reason) {
    throw new Error("reason_required_for_community_submission");
  }

  const now = new Date();
  await db
    .update(creations)
    .set({ status: "rejected", reviewedAt: now, reviewedByUserId: actor.steamid })
    .where(eq(creations.id, id));

  if (row?.uploadedByUserId) {
    const body = reason
      ? `"${row.title}" was not accepted. Reason: ${reason}`
      : `"${row.title}" was not accepted into the directory.`;
    await createNotification({
      userId: row.uploadedByUserId,
      type: "submission_rejected",
      title: "Submission not accepted",
      body,
      link: "/me/submissions",
    });
  }

  await logModAction({
    actor,
    action: "creation.reject",
    targetType: "creation",
    targetId: id,
    summary: `Rejected "${row?.title ?? id}"${reason ? ` — ${reason}` : ""}`,
    metadata: {
      reason: reason || null,
      community: !!row?.uploadedByUserId,
    },
  });

  revalidatePath("/admin/queue");
  // Note: intentionally not revalidating /admin/triage — the client component
  // manages its own buffer so the stack animation isn't interrupted by a
  // mid-flight RSC re-render.
}

/**
 * Triage fast-path: flip the creation to approved (visible on the public
 * site) without touching its tags. Keyword-suggested creation_tags rows
 * remain unconfirmed, so the community can vote on them. The creation
 * lands in /admin/queue as "needs tagging" until at least one of its
 * tags is admin-confirmed OR hits the +3 community-vote threshold.
 */
export async function quickApprove(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  const now = new Date();
  const [updated] = await db
    .update(creations)
    .set({
      status: "approved",
      reviewedAt: now,
      reviewedByUserId: actor.steamid,
      approvedAt: now,
      shortId: sql`COALESCE(${creations.shortId}, nextval(pg_get_serial_sequence('creations', 'short_id'))::integer)`,
    })
    .where(eq(creations.id, id))
    .returning({ shortId: creations.shortId });

  if (row?.uploadedByUserId) {
    await createNotification({
      userId: row.uploadedByUserId,
      type: "submission_approved",
      title: "Submission approved!",
      body: `"${row.title}" is now live on the site.`,
      link: `/creation/${updated?.shortId ?? id}`,
    });
  }

  await logModAction({
    actor,
    action: "creation.quickApprove",
    targetType: "creation",
    targetId: id,
    summary: `Quick-approved "${row?.title ?? id}"`,
    metadata: { community: !!row?.uploadedByUserId },
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function saveCreationTags(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const kind = parseKind(formData.get("kind"));
  const tagIds = parseTagIds(formData);

  await db.update(creations).set({ kind }).where(eq(creations.id, id));
  await replaceTagsForCreation(id, tagIds);

  await logModAction({
    actor,
    action: "creation.saveTags",
    targetType: "creation",
    targetId: id,
    summary: `Edited tags on ${id} (${tagIds.length} tags, kind=${kind})`,
    metadata: { kind, tagIds },
  });

  revalidatePath("/admin/queue");
}

/**
 * Mark a single tag as admin-confirmed on a creation — the inline
 * counterpart to the bulk saveCreationTags. Used from the creation detail
 * page so creators / mods can force a community tag visible without
 * waiting for the +3 vote threshold.
 */
export async function confirmCreationTag(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const creationId = String(formData.get("creationId") ?? "");
  const tagIdRaw = String(formData.get("tagId") ?? "");
  const tagId = Number(tagIdRaw);
  if (!creationId || !Number.isInteger(tagId) || tagId <= 0) {
    throw new Error("invalid_args");
  }
  await db
    .update(creationTags)
    .set({ confirmed: true, rejected: false })
    .where(
      and(eq(creationTags.creationId, creationId), eq(creationTags.tagId, tagId)),
    );
  await logModAction({
    actor,
    action: "creation.confirmTag",
    targetType: "creation",
    targetId: creationId,
    summary: `Confirmed tag #${tagId} on ${creationId}`,
    metadata: { tagId },
  });
  revalidatePath(`/creation/${creationId}`);
  revalidatePath("/admin/queue");
}

export async function getLatestIngestProgress(): Promise<{
  id: number | null;
  running: boolean;
  progress: IngestProgress | null;
}> {
  await requireMod();
  const db = getDb();
  const [row] = await db
    .select({
      id: ingestRuns.id,
      endedAt: ingestRuns.endedAt,
      progress: ingestRuns.progress,
    })
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);
  if (!row) return { id: null, running: false, progress: null };
  return {
    id: row.id,
    running: row.endedAt == null,
    progress: row.progress ?? null,
  };
}

export async function triggerIngest(formData?: FormData): Promise<void> {
  const actor = await requireCreator();
  let pagesPerKind: number | undefined;
  if (formData) {
    const raw = formData.get("pagesPerKind");
    const parsed = raw != null ? Number(raw) : NaN;
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 20) {
      pagesPerKind = parsed;
    }
  }
  // Manual admin runs explicitly want to dig the depth the moderator typed —
  // no early-stop. The cron path opts into minNewPerKind; this one doesn't.
  await runIngest({ pagesPerKind, minNewPerKind: 0 });
  await logModAction({
    actor,
    action: "ingest.manualRun",
    summary: `Manual ingest run (${pagesPerKind ?? "default"} pages/kind)`,
    metadata: { pagesPerKind: pagesPerKind ?? null },
  });
  revalidatePath("/admin/queue");
  revalidatePath("/admin/triage");
  revalidatePath("/admin/ingest");
}

export async function createTag(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;

  if (!slug || !name) throw new Error("slug and name required");
  if (!isEnglishTagName(name)) throw new Error(ENGLISH_TAG_ERROR);

  // On insert, stamp the creator. On update (same slug), leave the creator
  // untouched — we only want this column to answer "who originally added
  // this tag", not "who last edited it".
  const [row] = await db
    .insert(tags)
    .values({
      slug,
      name,
      categoryId: categoryId ?? null,
      createdByUserId: actor.steamid,
    })
    .onConflictDoUpdate({
      target: tags.slug,
      set: { name, categoryId: categoryId ?? null },
    })
    .returning({ id: tags.id, createdByUserId: tags.createdByUserId });

  const isNew = row?.createdByUserId === actor.steamid;
  await logModAction({
    actor,
    action: isNew ? "tag.create" : "tag.upsert",
    targetType: "tag",
    targetId: row ? String(row.id) : slug,
    summary: isNew
      ? `Created tag "${name}" (${slug})`
      : `Upserted tag "${name}" (${slug})`,
    metadata: { slug, name, categoryId },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/queue");
}

/**
 * Edit an existing tag's name, slug, or category. Creator-only because
 * slug changes break any bookmarked /search?tags=<slug> URL that points
 * at the old value — that's site-wide blast radius.
 *
 * tag_id is the stable FK that creation_tags references, so changing the
 * slug doesn't orphan anything.
 */
export async function updateTag(formData: FormData) {
  const actor = await requireCreator();
  const db = getDb();

  const tagIdRaw = String(formData.get("tagId") ?? "");
  const tagId = Number(tagIdRaw);
  if (!Number.isInteger(tagId) || tagId <= 0) throw new Error("invalid_tag_id");

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;

  if (!slug || !name) throw new Error("slug and name required");
  if (!isEnglishTagName(name)) throw new Error(ENGLISH_TAG_ERROR);

  // Reject slug collisions against other tags — the DB unique constraint
  // would catch it, but a friendlier error is worth the round-trip.
  const [conflict] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.slug, slug), ne(tags.id, tagId)))
    .limit(1);
  if (conflict) throw new Error(`slug_in_use: another tag already uses "${slug}"`);

  await db
    .update(tags)
    .set({ name, slug, categoryId: categoryId ?? null })
    .where(eq(tags.id, tagId));

  await logModAction({
    actor,
    action: "tag.update",
    targetType: "tag",
    targetId: String(tagId),
    summary: `Updated tag #${tagId} → "${name}" (${slug})`,
    metadata: { name, slug, categoryId },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin/queue");
  revalidatePath("/search");
}

function parsePublishedFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id");
    if (id && /^\d+$/.test(id)) return id;
  } catch {
    // not a URL — fall through
  }
  const match = trimmed.match(/id=(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Admin-side manual insert. Pulls a Workshop item directly by URL/ID,
 * skips the follow-count gate, optionally auto-approves. Runs the tagger
 * for brand-new rows so suggestions still appear in the queue/triage.
 */
export async function addCreation(formData: FormData) {
  const actor = await requireCreator();
  const raw = String(formData.get("input") ?? "").trim();
  const autoApprove = formData.get("approve") === "on";

  const parsedId = parsePublishedFileId(raw);
  if (!parsedId) {
    redirect(
      "/admin/add?error=" +
        encodeURIComponent("Couldn't parse a published file id from that URL or ID."),
    );
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    redirect(
      "/admin/add?error=" +
        encodeURIComponent("STEAM_API_KEY is not configured on the server."),
    );
  }

  let errorMsg: string | null = null;

  try {
    const [item] = await getPublishedFileDetails([parsedId]);
    if (!item) {
      errorMsg = "Item not found on Steam.";
    } else if (item.result != null && item.result !== 1) {
      errorMsg = `Steam rejected the request (result=${item.result}). The item may be private, banned, or the id is wrong.`;
    } else {
      const tagNames = (item.tags ?? []).map((t) => t.tag);
      const kind = detectKind(tagNames);
      const descRaw = pickFullDescription(item);
      const descClean = stripBBCode(descRaw);
      const now = new Date();

      let authorName: string | null = null;
      if (item.creator) {
        try {
          const names = await resolvePlayerNames(apiKey, [item.creator]);
          authorName = names.get(item.creator) ?? null;
        } catch {
          // resolving names is best-effort
        }
      }
      let creators: Array<{ steamid: string; name: string }> = [];
      try {
        const result = await fetchWorkshopContributors(apiKey, item.publishedfileid);
        if (result.ok) creators = result.contributors;
      } catch {
        // scraping is best-effort — falls back to single author
      }

      const db = getDb();
      const existingRows = await db
        .select({ id: creations.id })
        .from(creations)
        .where(eq(creations.id, parsedId))
        .limit(1);
      const isNew = existingRows.length === 0;

      const baseRow = {
        id: item.publishedfileid,
        title: item.title || "(untitled)",
        descriptionRaw: descRaw,
        descriptionClean: descClean,
        authorSteamid: item.creator ?? null,
        authorName,
        creators,
        thumbnailUrl: item.preview_url ?? null,
        steamUrl: steamUrlFor(item.publishedfileid),
        fileSizeBytes:
          typeof item.file_size === "string"
            ? Number(item.file_size) || null
            : (item.file_size ?? null),
        timeCreated: item.time_created ? new Date(item.time_created * 1000) : null,
        timeUpdated: item.time_updated ? new Date(item.time_updated * 1000) : null,
        voteScore: item.vote_data?.score ?? null,
        votesUp: item.vote_data?.votes_up ?? null,
        votesDown: item.vote_data?.votes_down ?? null,
        subscriptions: item.lifetime_subscriptions ?? item.subscriptions ?? 0,
        favorites: item.lifetime_favorited ?? item.favorited ?? 0,
        views: item.views ?? 0,
        steamTags: tagNames,
        kind,
      };

      await db
        .insert(creations)
        .values({
          ...baseRow,
          status: autoApprove ? "approved" : "pending",
          reviewedAt: autoApprove ? now : null,
          approvedAt: autoApprove ? now : null,
          // Only draw a short_id when the row is going live immediately;
          // pending rows stay NULL until a mod approves them.
          shortId: autoApprove
            ? sql`nextval(pg_get_serial_sequence('creations', 'short_id'))::integer`
            : null,
        })
        .onConflictDoUpdate({
          target: creations.id,
          set: {
            title: baseRow.title,
            descriptionRaw: baseRow.descriptionRaw,
            descriptionClean: baseRow.descriptionClean,
            authorName: baseRow.authorName,
            creators: baseRow.creators,
            thumbnailUrl: baseRow.thumbnailUrl,
            timeUpdated: baseRow.timeUpdated,
            voteScore: baseRow.voteScore,
            votesUp: baseRow.votesUp,
            votesDown: baseRow.votesDown,
            subscriptions: baseRow.subscriptions,
            favorites: baseRow.favorites,
            views: baseRow.views,
            steamTags: baseRow.steamTags,
            kind: baseRow.kind,
            ...(autoApprove
              ? {
                  status: "approved" as const,
                  reviewedAt: now,
                  approvedAt: now,
                  shortId: sql`COALESCE(${creations.shortId}, nextval(pg_get_serial_sequence('creations', 'short_id'))::integer)`,
                }
              : {}),
          },
        });

      if (isNew) {
        const suggestions = classify({
          title: baseRow.title,
          descriptionClean: descClean,
          steamTags: tagNames,
        });
        if (suggestions.length > 0) {
          const tagRows = await db
            .select({
              id: tags.id,
              slug: tags.slug,
              categoryId: tags.categoryId,
            })
            .from(tags);
          const tagBySlug = new Map(tagRows.map((t) => [t.slug, t]));
          const tagInserts: (typeof creationTags.$inferInsert)[] = [];
          const categoryIdSet = new Set<number>();
          for (const s of suggestions) {
            const tag = tagBySlug.get(s.slug);
            if (!tag) continue;
            tagInserts.push({
              creationId: item.publishedfileid,
              tagId: tag.id,
              source: s.source,
              confidence: s.confidence,
              confirmed: autoApprove,
            });
            if (tag.categoryId) categoryIdSet.add(tag.categoryId);
          }
          if (tagInserts.length > 0) {
            await db.insert(creationTags).values(tagInserts).onConflictDoNothing();
          }
          if (categoryIdSet.size > 0) {
            await db
              .insert(creationCategories)
              .values(
                Array.from(categoryIdSet).map((cid) => ({
                  creationId: item.publishedfileid,
                  categoryId: cid,
                })),
              )
              .onConflictDoNothing();
          }
        }
      } else if (autoApprove) {
        // Re-adding an existing item with auto-approve: confirm whatever tags exist.
        await db
          .update(creationTags)
          .set({ confirmed: true })
          .where(eq(creationTags.creationId, item.publishedfileid));
      }

      await logModAction({
        actor,
        action: autoApprove ? "creation.adminAddApproved" : "creation.adminAddPending",
        targetType: "creation",
        targetId: item.publishedfileid,
        summary: `${autoApprove ? "Approved" : "Queued"} manual add: "${item.title || "(untitled)"}" (${item.publishedfileid})`,
        metadata: { autoApprove, kind, isNew },
      });
      if (autoApprove) {
        await refreshAllTopCreatorBadges();
      }

      revalidatePath("/admin/queue");
      revalidatePath("/");
      revalidatePath("/new");
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (errorMsg) {
    redirect("/admin/add?error=" + encodeURIComponent(errorMsg));
  }
  redirect(
    `/admin/add?added=${parsedId}&status=${autoApprove ? "approved" : "pending"}`,
  );
}

/**
 * Re-scrape multi-creator attribution for a single creation immediately.
 * Useful when a user reports that an item is missing from a co-author's
 * profile — mods can force a fresh scrape without waiting for the weekly
 * refresh rotation. On scrape failure the stored `creators` is preserved
 * (same invariant as `refreshStaleCreators`). Mod+.
 */
export async function rescrapeCreatorsAction(formData: FormData) {
  const actor = await requireMod();
  const creationId = String(formData.get("creationId") ?? "").trim();
  const shortId = String(formData.get("shortId") ?? "").trim();
  if (!/^\d+$/.test(creationId)) throw new Error("invalid_creation_id");

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("steam_api_key_missing");

  const result = await fetchWorkshopContributors(apiKey, creationId);
  if (!result.ok) {
    const suffix = shortId ? `/creation/${shortId}` : "";
    redirect(`${suffix}?creators=err_${result.reason}`);
  }

  const db = getDb();
  await db
    .update(creations)
    .set({
      creators: result.contributors,
      creatorsRefreshedAt: new Date(),
    })
    .where(eq(creations.id, creationId));

  revalidatePath(`/creation/${creationId}`);
  if (shortId) revalidatePath(`/creation/${shortId}`);
  revalidatePath("/creators");
  // Revalidate every contributor's author + profile page so the new
  // attribution shows up immediately. Best-effort per-path calls; if one
  // path doesn't exist in the router it just no-ops.
  for (const c of result.contributors) {
    revalidatePath(`/author/${c.steamid}`);
    revalidatePath(`/profile/${c.steamid}`);
  }

  await logModAction({
    actor,
    action: "creation.rescrapeCreators",
    targetType: "creation",
    targetId: creationId,
    summary: `Re-scraped contributors on ${creationId} (found ${result.contributors.length})`,
    metadata: { count: result.contributors.length },
  });
  await refreshAllTopCreatorBadges();

  const suffix = shortId ? `/creation/${shortId}` : `/creation/${creationId}`;
  redirect(`${suffix}?creators=ok_${result.contributors.length}`);
}

async function requireMod() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  if (isBanned(user)) throw new Error("banned");
  if (!isModerator(effectiveRole(user))) throw new Error("not_a_mod");
  return user;
}

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  if (isBanned(user)) throw new Error("banned");
  if (effectiveRole(user) !== "creator") throw new Error("not_creator");
  return user;
}

export async function grantBadgeAction(formData: FormData) {
  const actor = await requireCreator();
  const targetSteamid = String(formData.get("steamid") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!/^\d{1,25}$/.test(targetSteamid)) throw new Error("invalid_steamid");
  if (!BADGE_SLUGS.includes(slug)) throw new Error("unknown_badge");
  if (SYSTEM_AUTO_BADGES.includes(slug)) {
    throw new Error("badge_system_auto_managed");
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  await grantBadge({
    userId: targetSteamid,
    slug,
    grantedByUserId: actor.steamid,
    note,
  });

  await logModAction({
    actor,
    action: "badge.grant",
    targetType: "user",
    targetId: targetSteamid,
    summary: `Granted badge "${slug}" to ${targetSteamid}${note ? ` — ${note}` : ""}`,
    metadata: { slug, note },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${targetSteamid}`);
}

// Parses whatever the creator pasted into the /admin/badges form —
// raw Steam64, a profile URL, or a vanity URL/name — into a Steam64. Uses
// Steam's ResolveVanityURL for the vanity cases.
async function parseSteamInput(raw: string): Promise<string | null> {
  const input = raw.trim();
  if (!input) return null;
  if (/^\d{17}$/.test(input)) return input;

  let pathOrVanity = input;
  try {
    const url = new URL(input);
    if (url.hostname.endsWith("steamcommunity.com")) {
      pathOrVanity = url.pathname.replace(/^\/+|\/+$/g, "");
    }
  } catch {
    // not a URL — treat input as a bare vanity name
  }

  const profileMatch = pathOrVanity.match(/^profiles\/(\d{17})$/);
  if (profileMatch) return profileMatch[1];

  const vanityMatch = pathOrVanity.match(/^id\/([^\/]+)$/);
  const vanity = vanityMatch ? vanityMatch[1] : pathOrVanity;
  if (!/^[A-Za-z0-9_-]+$/.test(vanity)) return null;

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;
  return resolveVanityUrl(apiKey, vanity);
}

export async function addInfluencerAutograntAction(formData: FormData) {
  const actor = await requireCreator();
  const slug = String(formData.get("slug") ?? "");
  if (!AUTOGRANT_BADGES.includes(slug)) throw new Error("badge_not_autograntable");

  const raw = String(formData.get("input") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 200) || null;
  const steamid = await parseSteamInput(raw);
  if (!steamid) throw new Error("could_not_resolve_steamid");
  // Defensive: the creator shouldn't autogrant themselves. They can
  // manually grant via /admin/users for a one-off (the catalog includes
  // manual-only badges too), but the influencer allowlist is for others.
  if (steamid === actor.steamid) throw new Error("cannot_autogrant_self");

  await addAutogrant({
    slug,
    steamid,
    label,
    addedByUserId: actor.steamid,
  });
  revalidatePath("/admin/badges");
  revalidatePath(`/profile/${steamid}`);
}

export async function removeInfluencerAutograntAction(formData: FormData) {
  await requireCreator();
  const slug = String(formData.get("slug") ?? "");
  const steamid = String(formData.get("steamid") ?? "");
  if (!AUTOGRANT_BADGES.includes(slug)) throw new Error("badge_not_autograntable");
  if (!/^\d{1,25}$/.test(steamid)) throw new Error("invalid_steamid");

  await removeAutogrant(slug, steamid);
  revalidatePath("/admin/badges");
  revalidatePath(`/profile/${steamid}`);
}

export async function revokeBadgeAction(formData: FormData) {
  const actor = await requireCreator();
  const targetSteamid = String(formData.get("steamid") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!/^\d{1,25}$/.test(targetSteamid)) throw new Error("invalid_steamid");
  if (!BADGE_SLUGS.includes(slug)) throw new Error("unknown_badge");

  await revokeBadge(targetSteamid, slug);

  await logModAction({
    actor,
    action: "badge.revoke",
    targetType: "user",
    targetId: targetSteamid,
    summary: `Revoked badge "${slug}" from ${targetSteamid}`,
    metadata: { slug },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${targetSteamid}`);
}

/**
 * Creator-only: pull a tag off a creation. Sets rejected=true on the
 * creation_tags row so future community votes can't bring it back; also
 * clears confirmed. Cleanest "remove this tag I added" escape hatch.
 */
export async function removeCreationTag(formData: FormData) {
  const actor = await requireCreator();
  const creationId = String(formData.get("creationId") ?? "");
  const tagIdRaw = String(formData.get("tagId") ?? "");
  const tagId = Number(tagIdRaw);
  if (!creationId) throw new Error("creationId required");
  if (!Number.isInteger(tagId) || tagId <= 0) throw new Error("invalid_tag_id");

  const db = getDb();
  await db
    .update(creationTags)
    .set({ rejected: true, confirmed: false })
    .where(
      and(
        eq(creationTags.creationId, creationId),
        eq(creationTags.tagId, tagId),
      ),
    );

  await logModAction({
    actor,
    action: "creation.removeTag",
    targetType: "creation",
    targetId: creationId,
    summary: `Removed tag #${tagId} from ${creationId}`,
    metadata: { tagId },
  });

  revalidatePath(`/creation/${creationId}`);
}

/**
 * Creator-only permanent delete. Marks the creation as status='deleted' so
 * ingest's blocklist refuses to re-add it and every public route treats it
 * as 404. Row is kept (not DELETE FROM) so the publishedfileid stays on the
 * blocklist forever unless the creator manually flips it back.
 */
export async function setCreationKind(formData: FormData) {
  // Creator-only: after the V8.17 fallback-to-"mod" change, auto-ingest and
  // /submit still occasionally misclassify an item (e.g. a blueprint tagged
  // only as "Mod" on Steam). Rather than force the creator into the
  // full admin-add dance, this lets them fix a single creation's kind
  // inline from its own page.
  const user = await requireCreator();
  const id = String(formData.get("creationId") ?? "");
  const kind = parseKind(formData.get("kind"));
  if (!id) throw new Error("creationId required");

  const db = getDb();
  const rows = await db
    .select({ kind: creations.kind })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);
  const existing = rows[0];
  if (!existing) throw new Error("creation_not_found");
  if (existing.kind === kind) return; // No-op — don't thrash revalidation.

  await db
    .update(creations)
    .set({ kind, reviewedAt: new Date(), reviewedByUserId: user.steamid })
    .where(eq(creations.id, id));

  await logModAction({
    actor: user,
    action: "creation.setKind",
    targetType: "creation",
    targetId: id,
    summary: `Kind ${existing.kind} → ${kind} on ${id}`,
    metadata: { from: existing.kind, to: kind },
  });

  // Changing kind moves the row between per-kind crown buckets — both the
  // old kind's leader and the new kind's leader can shift.
  await refreshAllTopCreatorBadges();

  // Kind-listing pages (`/[kind]`) are force-dynamic so they re-query on
  // every request — no explicit revalidation needed for those. The
  // creation page itself and the home / /new feeds do need busting.
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/search");
  revalidatePath(`/creation/${id}`);
}

export async function deleteCreation(formData: FormData) {
  const user = await requireCreator();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");

  const db = getDb();
  const [row] = await db
    .select({ title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  await db
    .update(creations)
    .set({
      status: "deleted",
      reviewedAt: new Date(),
      reviewedByUserId: user.steamid,
    })
    .where(eq(creations.id, id));

  // Clear every non-cleared report on this creation — both open (nothing
  // left to moderate) and actioned (public flag can't point at a deleted
  // creation). Otherwise "Currently flagged" in /admin/reports keeps the
  // row alive after the creation itself is gone.
  await db
    .update(reports)
    .set({
      status: "cleared",
      resolverUserId: user.steamid,
      resolverNote: "Creation deleted by Creator.",
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(reports.creationId, id),
        sql`${reports.status} IN ('open', 'actioned')`,
      ),
    );

  await logModAction({
    actor: user,
    action: "creation.delete",
    targetType: "creation",
    targetId: id,
    summary: `Hard-deleted "${row?.title ?? id}"`,
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/triage");
  revalidatePath("/admin/reports");
  revalidatePath(`/creation/${id}`);
}

export async function clearReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");

  const db = getDb();
  await db
    .update(reports)
    .set({
      status: "cleared",
      resolverUserId: user.steamid,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, id));

  await logModAction({
    actor: user,
    action: "report.clear",
    targetType: "report",
    targetId: String(id),
    summary: `Cleared report #${id}`,
  });

  revalidatePath("/admin/reports");
  revalidatePath("/");
}

export async function actionReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const db = getDb();
  const [row] = await db
    .select({ creationId: reports.creationId })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  if (!row) throw new Error("report_not_found");
  // actionReport produces a public creation flag — it's meaningless on a
  // comment report (use deleteCommentFromReport instead).
  if (!row.creationId) throw new Error("not_a_creation_report");

  await db
    .update(reports)
    .set({
      status: "actioned",
      resolverUserId: user.steamid,
      resolverNote: note,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, id));

  await logModAction({
    actor: user,
    action: "report.action",
    targetType: "report",
    targetId: String(id),
    summary: `Actioned report #${id} → creation ${row.creationId}${note ? ` — ${note}` : ""}`,
    metadata: { creationId: row.creationId, note },
  });

  revalidatePath("/admin/reports");
  revalidatePath(`/creation/${row.creationId}`);
  revalidatePath("/");
  revalidatePath("/new");
}

export async function deleteCommentFromReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  const db = getDb();
  const [row] = await db
    .select({
      reportId: reports.id,
      commentId: reports.commentId,
    })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  if (!row) throw new Error("report_not_found");
  if (row.commentId == null) throw new Error("not_a_comment_report");

  const [target] = await db
    .select({
      creationId: comments.creationId,
      profileSteamid: comments.profileSteamid,
    })
    .from(comments)
    .where(eq(comments.id, row.commentId))
    .limit(1);

  await db
    .update(comments)
    .set({ deletedAt: new Date(), deletedByUserId: user.steamid })
    .where(eq(comments.id, row.commentId));

  await db
    .update(reports)
    .set({
      status: "actioned",
      resolverUserId: user.steamid,
      resolverNote: note || "Comment deleted",
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, id));

  await logModAction({
    actor: user,
    action: "comment.deleteFromReport",
    targetType: "comment",
    targetId: String(row.commentId),
    summary: `Deleted comment #${row.commentId} via report #${id}${note ? ` — ${note}` : ""}`,
    metadata: { reportId: id, note },
  });

  revalidatePath("/admin/reports");
  if (target?.creationId) revalidatePath(`/creation/${target.creationId}`);
  if (target?.profileSteamid) revalidatePath(`/profile/${target.profileSteamid}`);
}

async function requireEliteMod() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  if (isBanned(user)) throw new Error("banned");
  const role = effectiveRole(user);
  if (role !== "elite_moderator" && role !== "creator") {
    throw new Error("not_elite_or_creator");
  }
  return user;
}

/**
 * Mod action: archive the creation (status='archived') AND action the
 * driving report. Elite mods can restore from /admin/archive; creator can
 * perma-delete. Archive is distinct from 'rejected' (triage reject) so we
 * keep a clear audit trail of what was public and got pulled.
 */
export async function archiveFromReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");
  const extra = String(formData.get("note") ?? "").trim().slice(0, 500);

  const db = getDb();
  const [row] = await db
    .select({ creationId: reports.creationId, reason: reports.reason })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  if (!row) throw new Error("report_not_found");
  if (!row.creationId) throw new Error("not_a_creation_report");
  const creationId: string = row.creationId;

  const now = new Date();

  await db
    .update(creations)
    .set({
      status: "archived",
      reviewedAt: now,
      reviewedByUserId: user.steamid,
    })
    .where(eq(creations.id, creationId));

  await db
    .update(reports)
    .set({
      status: "actioned",
      resolverUserId: user.steamid,
      resolverNote: extra
        ? `Archived: ${extra}`
        : `Archived for ${row.reason}.`,
      resolvedAt: now,
    })
    .where(eq(reports.id, id));

  const [creationRow] = await db
    .select({ title: creations.title })
    .from(creations)
    .where(eq(creations.id, row.creationId))
    .limit(1);
  await broadcastToRole({
    minRole: "elite_moderator",
    tier: "elite_moderator",
    type: "elite_creation_archived",
    title: `Creation archived: "${creationRow?.title ?? creationId}"`,
    body: `Archived from report${extra ? ` — ${extra.slice(0, 200)}` : ""}`,
    link: "/admin/archive",
    excludeUserId: user.steamid,
  });

  await logModAction({
    actor: user,
    action: "creation.archiveFromReport",
    targetType: "creation",
    targetId: creationId,
    summary: `Archived "${creationRow?.title ?? creationId}" via report #${id}${extra ? ` — ${extra}` : ""}`,
    metadata: { reportId: id, extra: extra || null, reason: row.reason },
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/admin/reports");
  revalidatePath("/admin/archive");
  revalidatePath(`/creation/${row.creationId}`);
  revalidatePath("/");
  revalidatePath("/new");
}

/**
 * Elite-mod+ action: pull an approved creation into the archive. Used from
 * the /creation detail page or /admin/archive directly (future).
 */
export async function archiveCreation(formData: FormData) {
  const user = await requireEliteMod();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const note = String(formData.get("note") ?? "").trim();

  const db = getDb();
  const now = new Date();
  await db
    .update(creations)
    .set({
      status: "archived",
      reviewedAt: now,
      reviewedByUserId: user.steamid,
    })
    .where(eq(creations.id, id));

  await db.insert(reports).values({
    creationId: id,
    reporterUserId: user.steamid,
    reason: "other",
    customText: note || "Manually archived.",
    source: "user",
    status: "actioned",
    resolverUserId: user.steamid,
    resolverNote: note || "Manually archived.",
    resolvedAt: now,
  });

  const [creationRow] = await db
    .select({ title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);
  await broadcastToRole({
    minRole: "elite_moderator",
    tier: "elite_moderator",
    type: "elite_creation_archived",
    title: `Creation archived: "${creationRow?.title ?? id}"`,
    body: note ? note.slice(0, 200) : "Manually archived.",
    link: "/admin/archive",
    excludeUserId: user.steamid,
  });

  await logModAction({
    actor: user,
    action: "creation.archive",
    targetType: "creation",
    targetId: id,
    summary: `Archived "${creationRow?.title ?? id}"${note ? ` — ${note}` : ""}`,
    metadata: { note: note || null },
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/admin/archive");
  revalidatePath(`/creation/${id}`);
  revalidatePath("/");
  revalidatePath("/new");
}

/**
 * Elite-mod+ action: bring a creation back from the archive into the
 * approved public feed. Preserves the existing tags and vote history.
 */
export async function restoreFromArchive(formData: FormData) {
  const user = await requireEliteMod();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");

  const db = getDb();
  const now = new Date();
  await db
    .update(creations)
    .set({
      status: "approved",
      reviewedAt: now,
      reviewedByUserId: user.steamid,
      approvedAt: now,
    })
    .where(eq(creations.id, id));

  // Clear any lingering actioned reports so the public badge disappears.
  await db
    .update(reports)
    .set({
      status: "cleared",
      resolverUserId: user.steamid,
      resolverNote: "Restored from archive.",
      resolvedAt: now,
    })
    .where(and(eq(reports.creationId, id), eq(reports.status, "actioned")));

  await logModAction({
    actor: user,
    action: "creation.restoreFromArchive",
    targetType: "creation",
    targetId: id,
    summary: `Restored creation ${id} from archive`,
  });
  await refreshAllTopCreatorBadges();

  revalidatePath("/admin/archive");
  revalidatePath(`/creation/${id}`);
  revalidatePath("/");
  revalidatePath("/new");
}

const ASSIGNABLE_ROLES = ["user", "moderator", "elite_moderator"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function parseDurationDays(raw: FormDataEntryValue | null): Date | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value || value === "perma" || value === "permanent") {
    // Anchor "permanent" at year 9999 so regular date comparisons still work.
    return new Date("9999-12-31T00:00:00Z");
  }
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(Date.now() + days * 86_400_000);
}

/**
 * Creator-only role assignment. Moderators physically cannot call this —
 * requireCreator() throws for them. The creator role itself is anchored by
 * the CREATOR_STEAMID env var and cannot be granted or revoked through the UI.
 */
export async function setUserRole(formData: FormData) {
  const actor = await requireCreator();
  const targetSteamid = String(formData.get("steamid") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "").trim();

  if (!targetSteamid) throw new Error("steamid required");
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(rawRole)) {
    throw new Error("invalid_role");
  }
  const newRole = rawRole as AssignableRole;

  if (targetSteamid === actor.steamid) {
    throw new Error("cannot_change_own_role");
  }

  const db = getDb();
  const [target] = await db
    .select({
      role: users.role,
      moderatorSinceAt: users.moderatorSinceAt,
    })
    .from(users)
    .where(eq(users.steamid, targetSteamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_modify_creator");

  // First-time promotion to mod+ stamps moderator_since_at. Subsequent
  // promotions (e.g. after a demotion) preserve the original date so the
  // profile badge reflects when they originally joined the team.
  const wasMod = isModerator(target.role as "user" | "moderator" | "elite_moderator" | "creator");
  const isNowMod = isModerator(newRole);
  const updateSet: { role: typeof newRole; moderatorSinceAt?: Date } = {
    role: newRole,
  };
  if (isNowMod && !wasMod && !target.moderatorSinceAt) {
    updateSet.moderatorSinceAt = new Date();
  }

  await db
    .update(users)
    .set(updateSet)
    .where(eq(users.steamid, targetSteamid));

  await logModAction({
    actor,
    action: "user.setRole",
    targetType: "user",
    targetId: targetSteamid,
    summary: `Set role ${target.role} → ${newRole} for ${targetSteamid}`,
    metadata: { from: target.role, to: newRole },
  });

  revalidatePath("/admin/users");
}

/**
 * Ban a user (creator-only). Duration in days, or "perma" for permanent.
 * Banned users can still visit public pages as a ghost but lose their
 * session + can't vote / report / comment / favourite.
 */
export async function banUser(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");
  if (steamid === actor.steamid) throw new Error("cannot_ban_self");

  const until = parseDurationDays(formData.get("duration"));
  if (!until) throw new Error("invalid_duration");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;

  const db = getDb();
  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_ban_creator");

  await db
    .update(users)
    .set({ bannedUntil: until, banReason: reason })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.ban",
    targetType: "user",
    targetId: steamid,
    summary: `Banned ${steamid} until ${until.toISOString()}${reason ? ` — ${reason}` : ""}`,
    metadata: { until: until.toISOString(), reason },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearBan(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({ bannedUntil: null, banReason: null })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.unban",
    targetType: "user",
    targetId: steamid,
    summary: `Cleared ban on ${steamid}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

/**
 * Mute a user (elite-mod+). Mutes block votes/reports/comments/favourites
 * but still allow browsing.
 */
export async function muteUser(formData: FormData) {
  const actor = await requireEliteMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");
  if (steamid === actor.steamid) throw new Error("cannot_mute_self");

  const until = parseDurationDays(formData.get("duration"));
  if (!until) throw new Error("invalid_duration");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;

  const db = getDb();
  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_mute_creator");

  await db
    .update(users)
    .set({ mutedUntil: until, muteReason: reason })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.mute",
    targetType: "user",
    targetId: steamid,
    summary: `Muted ${steamid} until ${until.toISOString()}${reason ? ` — ${reason}` : ""}`,
    metadata: { until: until.toISOString(), reason },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearMute(formData: FormData) {
  const actor = await requireEliteMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!/^\d{1,25}$/.test(steamid)) throw new Error("invalid_steamid");

  const db = getDb();
  const [target] = await db
    .select({ steamid: users.steamid })
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");

  await db
    .update(users)
    .set({ mutedUntil: null, muteReason: null })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.unmute",
    targetType: "user",
    targetId: steamid,
    summary: `Cleared mute on ${steamid}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

/**
 * Warn a user. Increments warningsCount and stores latest note (replacing).
 * Mods can warn but can't ban or mute — warnings are their soft tool.
 */
/**
 * Hard ban a Steam ID: sets the flag, blocks future sign-ins entirely, and
 * invalidates any existing session cookie (because getCurrentUser returns
 * null for hard-banned users). Creator-only; use with care — this is the
 * nuclear option.
 */
export async function hardBanUser(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");
  if (steamid === actor.steamid) throw new Error("cannot_hard_ban_self");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const db = getDb();
  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_hard_ban_creator");

  await db
    .update(users)
    .set({
      hardBanned: true,
      banReason: reason ?? "Hard ban.",
      bannedUntil: new Date("9999-12-31T00:00:00Z"),
    })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.hardBan",
    targetType: "user",
    targetId: steamid,
    summary: `Hard-banned ${steamid}${reason ? ` — ${reason}` : ""}`,
    metadata: { reason },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearHardBan(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({
      hardBanned: false,
      bannedUntil: null,
      banReason: null,
    })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.clearHardBan",
    targetType: "user",
    targetId: steamid,
    summary: `Cleared hard-ban on ${steamid}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearWarnings(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({ warningsCount: 0, warningNote: null })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.clearWarnings",
    targetType: "user",
    targetId: steamid,
    summary: `Cleared warnings on ${steamid}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

/**
 * Creator-only: toggle the 7-day Steam account-age gate bypass for a
 * specific user. Useful for trusted community members on fresh Steam
 * accounts who would otherwise be told to wait a week before they can
 * submit / comment / vote.
 */
export async function setAgeGateBypass(formData: FormData) {
  const actor = await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");
  const onRaw = String(formData.get("on") ?? "").trim();
  const on = onRaw === "1" || onRaw === "true";

  const db = getDb();
  await db
    .update(users)
    .set({ bypassAgeGate: on })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: on ? "user.grantAgeGateBypass" : "user.revokeAgeGateBypass",
    targetType: "user",
    targetId: steamid,
    summary: on
      ? `Granted age-gate bypass to ${steamid}`
      : `Revoked age-gate bypass from ${steamid}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

// Appeal-queue actions — mod+ so the /admin/appeals tab is actually useful
// without needing to ping the creator. The raw setAgeGateBypass above stays
// creator-only because the /admin/users editor targets arbitrary accounts;
// the appeal path only touches users who self-identified via the appeal form.
export async function grantAgeGateAppeal(formData: FormData) {
  const actor = await requireMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!/^\d{1,25}$/.test(steamid)) throw new Error("invalid_steamid");

  const db = getDb();
  await db
    .update(users)
    .set({ bypassAgeGate: true, ageGateAppealHandledAt: new Date() })
    .where(eq(users.steamid, steamid));

  await createNotification({
    userId: steamid,
    type: "age_gate_appeal_granted",
    title: "Your age-gate appeal was approved",
    body: "A moderator has let you past the 7-day Steam account-age check. You can now submit, comment, and vote.",
    link: "/",
  });

  await logModAction({
    actor,
    action: "appeal.grant",
    targetType: "user",
    targetId: steamid,
    summary: `Granted age-gate appeal for ${steamid}`,
  });

  revalidatePath("/admin/appeals");
  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function dismissAgeGateAppeal(formData: FormData) {
  const actor = await requireMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!/^\d{1,25}$/.test(steamid)) throw new Error("invalid_steamid");

  const db = getDb();
  await db
    .update(users)
    .set({ ageGateAppealHandledAt: new Date() })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "appeal.dismiss",
    targetType: "user",
    targetId: steamid,
    summary: `Dismissed age-gate appeal for ${steamid}`,
  });

  revalidatePath("/admin/appeals");
}

export async function warnUser(formData: FormData) {
  const actor = await requireMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");
  if (steamid === actor.steamid) throw new Error("cannot_warn_self");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const db = getDb();
  const [target] = await db
    .select({ role: users.role, warningsCount: users.warningsCount })
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_warn_creator");

  await db
    .update(users)
    .set({
      warningsCount: (target.warningsCount ?? 0) + 1,
      warningNote: note,
    })
    .where(eq(users.steamid, steamid));

  await logModAction({
    actor,
    action: "user.warn",
    targetType: "user",
    targetId: steamid,
    summary: `Warned ${steamid}${note ? ` — ${note}` : ""}`,
    metadata: { note, total: (target.warningsCount ?? 0) + 1 },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function createCategory(formData: FormData) {
  const actor = await requireMod();
  const db = getDb();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!slug || !name) throw new Error("slug and name required");
  const [row] = await db
    .insert(categories)
    .values({ slug, name, description, createdByUserId: actor.steamid })
    .onConflictDoUpdate({ target: categories.slug, set: { name, description } })
    .returning({ id: categories.id, createdByUserId: categories.createdByUserId });

  const isNew = row?.createdByUserId === actor.steamid;
  await logModAction({
    actor,
    action: isNew ? "category.create" : "category.upsert",
    targetType: "category",
    targetId: row ? String(row.id) : slug,
    summary: isNew
      ? `Created category "${name}" (${slug})`
      : `Upserted category "${name}" (${slug})`,
    metadata: { slug, name, description },
  });

  revalidatePath("/admin/tags");
}

// Creator-only because it's destructive and can't be undone from the UI.
// Schema FKs handle cleanup: tags.categoryId goes null (tag drops to
// "Uncategorised"), creation_categories rows cascade away. Creations
// themselves are untouched.
export async function deleteCategory(formData: FormData) {
  const actor = await requireCreator();
  const idRaw = String(formData.get("categoryId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_category_id");
  const db = getDb();
  await db.delete(categories).where(eq(categories.id, id));
  await logModAction({
    actor,
    action: "category.delete",
    targetType: "category",
    targetId: String(id),
    summary: `Deleted category #${id}`,
  });
  revalidatePath("/admin/tags");
  revalidatePath("/search");
}
