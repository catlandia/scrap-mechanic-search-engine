"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  creationCategories,
  creationTags,
  creations,
  reports,
  tags,
} from "@/lib/db/schema";
import { runIngest } from "@/lib/ingest/pipeline";
import { CREATION_KINDS } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import {
  detectKind,
  getPublishedFileDetails,
  resolvePlayerNames,
  steamUrlFor,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";
import { classify } from "@/lib/tagger/classify";

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
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const kind = parseKind(formData.get("kind"));
  const tagIds = parseTagIds(formData);

  const now = new Date();
  await db
    .update(creations)
    .set({ status: "approved", kind, reviewedAt: now, approvedAt: now })
    .where(eq(creations.id, id));

  await replaceTagsForCreation(id, tagIds);

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function rejectCreation(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const now = new Date();
  await db
    .update(creations)
    .set({ status: "rejected", reviewedAt: now })
    .where(eq(creations.id, id));
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
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const now = new Date();

  await db
    .update(creations)
    .set({ status: "approved", reviewedAt: now, approvedAt: now })
    .where(eq(creations.id, id));

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function saveCreationTags(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const kind = parseKind(formData.get("kind"));
  const tagIds = parseTagIds(formData);

  await db.update(creations).set({ kind }).where(eq(creations.id, id));
  await replaceTagsForCreation(id, tagIds);

  revalidatePath("/admin/queue");
}

export async function triggerIngest(formData?: FormData): Promise<void> {
  let pagesPerKind: number | undefined;
  if (formData) {
    const raw = formData.get("pagesPerKind");
    const parsed = raw != null ? Number(raw) : NaN;
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 20) {
      pagesPerKind = parsed;
    }
  }
  await runIngest({ pagesPerKind });
  revalidatePath("/admin/queue");
  revalidatePath("/admin/triage");
  revalidatePath("/admin/ingest");
}

export async function createTag(formData: FormData) {
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

  await db
    .insert(tags)
    .values({ slug, name, categoryId: categoryId ?? null })
    .onConflictDoUpdate({
      target: tags.slug,
      set: { name, categoryId: categoryId ?? null },
    });
  revalidatePath("/admin/tags");
  revalidatePath("/admin/queue");
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
      const descRaw = item.file_description || item.short_description || "";
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
        })
        .onConflictDoUpdate({
          target: creations.id,
          set: {
            title: baseRow.title,
            descriptionRaw: baseRow.descriptionRaw,
            descriptionClean: baseRow.descriptionClean,
            authorName: baseRow.authorName,
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
              ? { status: "approved" as const, reviewedAt: now, approvedAt: now }
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

async function requireMod() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  if (!isModerator(user.role as UserRole)) throw new Error("not_a_mod");
  return user;
}

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  if ((user.role as UserRole) !== "creator") throw new Error("not_creator");
  return user;
}

/**
 * Creator-only permanent delete. Marks the creation as status='deleted' so
 * ingest's blocklist refuses to re-add it and every public route treats it
 * as 404. Row is kept (not DELETE FROM) so the publishedfileid stays on the
 * blocklist forever unless the creator manually flips it back.
 */
export async function deleteCreation(formData: FormData) {
  const user = await requireCreator();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");

  const db = getDb();
  await db
    .update(creations)
    .set({
      status: "deleted",
      reviewedAt: new Date(),
      reviewedByUserId: user.steamid,
    })
    .where(eq(creations.id, id));

  // Also clear any open reports on this creation — there's nothing left to
  // moderate now that it's gone.
  await db
    .update(reports)
    .set({
      status: "cleared",
      resolverUserId: user.steamid,
      resolverNote: "Creation deleted by Creator.",
      resolvedAt: new Date(),
    })
    .where(and(eq(reports.creationId, id), eq(reports.status, "open")));

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

  revalidatePath("/admin/reports");
  revalidatePath("/");
}

export async function actionReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");
  const note = String(formData.get("note") ?? "").trim() || null;

  const db = getDb();
  const [row] = await db
    .select({ creationId: reports.creationId })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  if (!row) throw new Error("report_not_found");

  await db
    .update(reports)
    .set({
      status: "actioned",
      resolverUserId: user.steamid,
      resolverNote: note,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, id));

  revalidatePath("/admin/reports");
  revalidatePath(`/creation/${row.creationId}`);
  revalidatePath("/");
  revalidatePath("/new");
}

/**
 * Mod action: hide the creation from public view (status='rejected') AND
 * mark the driving report as actioned. For now 'rejected' doubles as the
 * archive bucket — elite-mod restore UI ships in v2.1. The report gets an
 * automatic resolver note explaining the archive so it appears in the
 * "Currently flagged" list with context.
 */
export async function archiveFromReport(formData: FormData) {
  const user = await requireMod();
  const idRaw = String(formData.get("reportId") ?? "");
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_report_id");
  const extra = String(formData.get("note") ?? "").trim();

  const db = getDb();
  const [row] = await db
    .select({ creationId: reports.creationId, reason: reports.reason })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  if (!row) throw new Error("report_not_found");

  const now = new Date();

  await db
    .update(creations)
    .set({
      status: "rejected",
      reviewedAt: now,
      reviewedByUserId: user.steamid,
    })
    .where(eq(creations.id, row.creationId));

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

  revalidatePath("/admin/reports");
  revalidatePath(`/creation/${row.creationId}`);
  revalidatePath("/");
  revalidatePath("/new");
}

export async function createCategory(formData: FormData) {
  const db = getDb();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!slug || !name) throw new Error("slug and name required");
  await db
    .insert(categories)
    .values({ slug, name, description })
    .onConflictDoUpdate({ target: categories.slug, set: { name, description } });
  revalidatePath("/admin/tags");
}
