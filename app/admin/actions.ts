"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  creationCategories,
  creationTags,
  creations,
  reports,
  tags,
  users,
} from "@/lib/db/schema";
import { runIngest } from "@/lib/ingest/pipeline";
import { CREATION_KINDS } from "@/lib/db/schema";
import { getCurrentUser, isBanned } from "@/lib/auth/session";
import { effectiveRole, isModerator } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/schema";
import {
  detectKind,
  getPublishedFileDetails,
  resolvePlayerNames,
  steamUrlFor,
} from "@/lib/steam/client";
import { stripBBCode } from "@/lib/steam/bbcode";
import { classify } from "@/lib/tagger/classify";
import { broadcastToRole, createNotification } from "@/lib/db/notifications";

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
  await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const kind = parseKind(formData.get("kind"));
  const tagIds = parseTagIds(formData);

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title, shortId: creations.shortId })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  const now = new Date();
  await db
    .update(creations)
    .set({ status: "approved", kind, reviewedAt: now, approvedAt: now })
    .where(eq(creations.id, id));

  await replaceTagsForCreation(id, tagIds);

  if (row?.uploadedByUserId) {
    await createNotification({
      userId: row.uploadedByUserId,
      type: "submission_approved",
      title: "Submission approved!",
      body: `"${row.title}" is now live on the site.`,
      link: `/creation/${row.shortId}`,
    });
  }

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function rejectCreation(formData: FormData) {
  await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  const now = new Date();
  await db
    .update(creations)
    .set({ status: "rejected", reviewedAt: now })
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
  await requireMod();
  const db = getDb();
  const id = String(formData.get("creationId") ?? "");
  if (!id) throw new Error("creationId required");

  const [row] = await db
    .select({ uploadedByUserId: creations.uploadedByUserId, title: creations.title, shortId: creations.shortId })
    .from(creations)
    .where(eq(creations.id, id))
    .limit(1);

  const now = new Date();
  await db
    .update(creations)
    .set({ status: "approved", reviewedAt: now, approvedAt: now })
    .where(eq(creations.id, id));

  if (row?.uploadedByUserId) {
    await createNotification({
      userId: row.uploadedByUserId,
      type: "submission_approved",
      title: "Submission approved!",
      body: `"${row.title}" is now live on the site.`,
      link: `/creation/${row.shortId}`,
    });
  }

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath("/new");
}

export async function saveCreationTags(formData: FormData) {
  await requireMod();
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
  await requireMod();
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
  await requireMod();
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
  await requireMod();
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

/**
 * Creator-only: pull a tag off a creation. Sets rejected=true on the
 * creation_tags row so future community votes can't bring it back; also
 * clears confirmed. Cleanest "remove this tag I added" escape hatch.
 */
export async function removeCreationTag(formData: FormData) {
  await requireCreator();
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

  revalidatePath(`/creation/${creationId}`);
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
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

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

  const now = new Date();

  await db
    .update(creations)
    .set({
      status: "archived",
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

  const [creationRow] = await db
    .select({ title: creations.title })
    .from(creations)
    .where(eq(creations.id, row.creationId))
    .limit(1);
  await broadcastToRole({
    minRole: "elite_moderator",
    tier: "elite_moderator",
    type: "elite_creation_archived",
    title: `Creation archived: "${creationRow?.title ?? row.creationId}"`,
    body: `Archived from report${extra ? ` — ${extra.slice(0, 200)}` : ""}`,
    link: "/admin/archive",
    excludeUserId: user.steamid,
  });

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
    .select({ role: users.role })
    .from(users)
    .where(eq(users.steamid, targetSteamid))
    .limit(1);
  if (!target) throw new Error("user_not_found");
  if (target.role === "creator") throw new Error("cannot_modify_creator");

  await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.steamid, targetSteamid));

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

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearBan(formData: FormData) {
  await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({ bannedUntil: null, banReason: null })
    .where(eq(users.steamid, steamid));

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

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearMute(formData: FormData) {
  await requireEliteMod();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({ mutedUntil: null, muteReason: null })
    .where(eq(users.steamid, steamid));

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

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearHardBan(formData: FormData) {
  await requireCreator();
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

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function clearWarnings(formData: FormData) {
  await requireCreator();
  const steamid = String(formData.get("steamid") ?? "").trim();
  if (!steamid) throw new Error("steamid required");

  const db = getDb();
  await db
    .update(users)
    .set({ warningsCount: 0, warningNote: null })
    .where(eq(users.steamid, steamid));

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
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

  revalidatePath("/admin/users");
  revalidatePath(`/profile/${steamid}`);
}

export async function createCategory(formData: FormData) {
  await requireMod();
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
