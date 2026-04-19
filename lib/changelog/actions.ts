"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import {
  CHANGELOG_TIERS,
  changelogEntries,
  changelogReads,
  users,
  type ChangelogTier,
} from "@/lib/db/schema";

const MAX_TITLE = 140;
const MAX_BODY = 8000;

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  if (!isCreator(effectiveRole(user) ?? undefined)) throw new Error("not_creator");
  return user;
}

function parseTier(raw: FormDataEntryValue | null): ChangelogTier {
  const value = String(raw ?? "update");
  return (CHANGELOG_TIERS as readonly string[]).includes(value)
    ? (value as ChangelogTier)
    : "update";
}

export type ChangelogEntryRow = {
  id: number;
  tier: ChangelogTier;
  title: string;
  body: string | null;
  authorName: string | null;
  authorSteamid: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

async function selectEntries(options: {
  publishedOnly: boolean;
  includeDeleted: boolean;
}): Promise<ChangelogEntryRow[]> {
  const db = getDb();
  const conditions = [] as ReturnType<typeof and>[];
  if (options.publishedOnly) {
    conditions.push(sql`${changelogEntries.publishedAt} is not null`);
  }
  if (!options.includeDeleted) {
    conditions.push(isNull(changelogEntries.deletedAt));
  }
  const rows = await db
    .select({
      id: changelogEntries.id,
      tier: changelogEntries.tier,
      title: changelogEntries.title,
      body: changelogEntries.body,
      authorName: users.personaName,
      authorSteamid: users.steamid,
      publishedAt: changelogEntries.publishedAt,
      createdAt: changelogEntries.createdAt,
      updatedAt: changelogEntries.updatedAt,
      deletedAt: changelogEntries.deletedAt,
    })
    .from(changelogEntries)
    .leftJoin(users, eq(users.steamid, changelogEntries.authorUserId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(changelogEntries.publishedAt),
      desc(changelogEntries.createdAt),
    );
  return rows.map((r) => ({ ...r, tier: r.tier as ChangelogTier }));
}

export async function getPublishedEntries(): Promise<ChangelogEntryRow[]> {
  return selectEntries({ publishedOnly: true, includeDeleted: false });
}

export async function getAllEntriesForAdmin(): Promise<ChangelogEntryRow[]> {
  await requireCreator();
  return selectEntries({ publishedOnly: false, includeDeleted: true });
}

/**
 * Returns the count of published changelog entries the signed-in user
 * hasn't seen yet. Drives the top-bar "What's new" unread pill. For
 * signed-out visitors or users who've never opened /changelog, everything
 * counts as unread — capped to a small max so the badge doesn't scream.
 */
export async function getUnreadChangelogCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const db = getDb();
  const [read] = await db
    .select({ lastSeen: changelogReads.lastSeenEntryId })
    .from(changelogReads)
    .where(eq(changelogReads.userId, user.steamid))
    .limit(1);
  const lastSeen = read?.lastSeen ?? 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(changelogEntries)
    .where(
      and(
        sql`${changelogEntries.publishedAt} is not null`,
        isNull(changelogEntries.deletedAt),
        sql`${changelogEntries.id} > ${lastSeen}`,
      ),
    );
  return Math.min(99, row?.n ?? 0);
}

/**
 * Mark-as-read is fire-and-forget from the /changelog page. We bump
 * `lastSeenEntryId` to the highest published id so the next time the
 * user loads the site the pill is gone.
 */
export async function markChangelogRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const db = getDb();
  const [latest] = await db
    .select({ id: changelogEntries.id })
    .from(changelogEntries)
    .where(
      and(
        sql`${changelogEntries.publishedAt} is not null`,
        isNull(changelogEntries.deletedAt),
      ),
    )
    .orderBy(desc(changelogEntries.id))
    .limit(1);
  if (!latest) return;
  await db
    .insert(changelogReads)
    .values({
      userId: user.steamid,
      lastSeenEntryId: latest.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: changelogReads.userId,
      set: { lastSeenEntryId: latest.id, updatedAt: new Date() },
    });
}

export async function createChangelogEntry(
  formData: FormData,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const author = await requireCreator();
    const tier = parseTier(formData.get("tier"));
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const publishNow = formData.get("publish") === "1";
    if (!title) return { ok: false, error: "Title required." };
    if (title.length > MAX_TITLE)
      return { ok: false, error: `Title must be ≤ ${MAX_TITLE} chars.` };
    if (body.length > MAX_BODY)
      return { ok: false, error: `Body must be ≤ ${MAX_BODY} chars.` };

    const db = getDb();
    const [inserted] = await db
      .insert(changelogEntries)
      .values({
        tier,
        title,
        body: body || null,
        authorUserId: author.steamid,
        publishedAt: publishNow ? new Date() : null,
      })
      .returning({ id: changelogEntries.id });

    // Discovery happens via the top-bar "What's new" link + unread pill,
    // not the notification bell — every signed-in user would get spammed
    // otherwise, and the pill already covers the use case.

    revalidatePath("/changelog");
    revalidatePath("/admin/changelog");
    return { ok: true, id: inserted?.id };
  } catch (err) {
    const code = err instanceof Error ? err.message : "failed";
    return { ok: false, error: friendlyError(code) };
  }
}

export async function updateChangelogEntry(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireCreator();
    const idRaw = String(formData.get("id") ?? "");
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0)
      return { ok: false, error: "Invalid id." };
    const tier = parseTier(formData.get("tier"));
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!title) return { ok: false, error: "Title required." };
    if (title.length > MAX_TITLE)
      return { ok: false, error: `Title must be ≤ ${MAX_TITLE} chars.` };
    if (body.length > MAX_BODY)
      return { ok: false, error: `Body must be ≤ ${MAX_BODY} chars.` };

    const db = getDb();
    await db
      .update(changelogEntries)
      .set({
        tier,
        title,
        body: body || null,
        updatedAt: new Date(),
      })
      .where(eq(changelogEntries.id, id));

    revalidatePath("/changelog");
    revalidatePath("/admin/changelog");
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "failed";
    return { ok: false, error: friendlyError(code) };
  }
}

export async function publishChangelogEntry(formData: FormData): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(changelogEntries)
    .set({ publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(changelogEntries.id, id));
  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
}

export async function unpublishChangelogEntry(
  formData: FormData,
): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(changelogEntries)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(eq(changelogEntries.id, id));
  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
}

export async function softDeleteChangelogEntry(
  formData: FormData,
): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(changelogEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(changelogEntries.id, id));
  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
}

export async function restoreChangelogEntry(
  formData: FormData,
): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(changelogEntries)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(changelogEntries.id, id));
  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
}

function friendlyError(code: string): string {
  if (code === "signed_out") return "You need to sign in.";
  if (code === "not_creator") return "Creator only.";
  if (code === "invalid_id") return "Invalid entry id.";
  if (code === "not_found") return "Entry not found.";
  return code;
}
