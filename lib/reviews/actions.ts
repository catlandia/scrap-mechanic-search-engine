"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import { gameReviews, users } from "@/lib/db/schema";

const MAX_TITLE = 140;
const MAX_BODY = 20000;
const MAX_BULLET = 200;
const MAX_BULLETS = 12;

export type GameReviewRow = {
  id: number;
  slug: string;
  title: string;
  steamAppId: number | null;
  thumbnailUrl: string | null;
  score: number | null;
  body: string;
  pros: string[];
  cons: string[];
  authorName: string | null;
  authorSteamid: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

async function requireCreator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("signed_out");
  if (!isCreator(effectiveRole(user) ?? undefined)) throw new Error("not_creator");
  return user;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseBullets(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? "");
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_BULLETS)
    .map((line) => line.slice(0, MAX_BULLET));
}

function parseScore(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  const onTen = parsed > 10 ? parsed / 10 : parsed;
  const scaled = Math.round(onTen * 10);
  if (scaled < 0 || scaled > 100) return null;
  return scaled;
}

type ParsedReviewFields = {
  title: string;
  body: string;
  slugBase: string;
  steamAppId: number | null;
  thumbnailUrl: string | null;
  score: number | null;
  pros: string[];
  cons: string[];
};

function parseFields(formData: FormData):
  | { ok: true; fields: ParsedReviewFields }
  | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Title required." };
  if (title.length > MAX_TITLE)
    return { ok: false, error: `Title must be ≤ ${MAX_TITLE} chars.` };

  const body = String(formData.get("body") ?? "").trim();
  if (body.length > MAX_BODY)
    return { ok: false, error: `Body must be ≤ ${MAX_BODY} chars.` };

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slugBase = slugify(slugRaw || title);

  const steamAppRaw = String(formData.get("steamAppId") ?? "").trim();
  const steamAppId = steamAppRaw === "" ? null : Number(steamAppRaw);
  if (steamAppId !== null && (!Number.isInteger(steamAppId) || steamAppId <= 0))
    return { ok: false, error: "Steam App ID must be a positive integer." };

  const thumbnailRaw = String(formData.get("thumbnailUrl") ?? "").trim();
  const thumbnailUrl = thumbnailRaw || null;

  return {
    ok: true,
    fields: {
      title,
      body,
      slugBase,
      steamAppId,
      thumbnailUrl,
      score: parseScore(formData.get("score")),
      pros: parseBullets(formData.get("pros")),
      cons: parseBullets(formData.get("cons")),
    },
  };
}

async function ensureUniqueSlug(base: string, ignoreId?: number): Promise<string> {
  const db = getDb();
  let candidate = base || `review-${Date.now().toString(36)}`;
  let suffix = 1;
  while (true) {
    const rows = await db
      .select({ id: gameReviews.id })
      .from(gameReviews)
      .where(eq(gameReviews.slug, candidate))
      .limit(1);
    const conflict = rows[0];
    if (!conflict || conflict.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function selectRows(options: {
  publishedOnly: boolean;
  includeDeleted: boolean;
  slug?: string;
}): Promise<GameReviewRow[]> {
  const db = getDb();
  const conditions: ReturnType<typeof and>[] = [];
  if (options.publishedOnly) {
    conditions.push(sql`${gameReviews.publishedAt} is not null`);
  }
  if (!options.includeDeleted) {
    conditions.push(isNull(gameReviews.deletedAt));
  }
  if (options.slug) {
    conditions.push(eq(gameReviews.slug, options.slug));
  }
  const rows = await db
    .select({
      id: gameReviews.id,
      slug: gameReviews.slug,
      title: gameReviews.title,
      steamAppId: gameReviews.steamAppId,
      thumbnailUrl: gameReviews.thumbnailUrl,
      score: gameReviews.score,
      body: gameReviews.body,
      pros: gameReviews.pros,
      cons: gameReviews.cons,
      authorName: users.personaName,
      authorSteamid: users.steamid,
      publishedAt: gameReviews.publishedAt,
      createdAt: gameReviews.createdAt,
      updatedAt: gameReviews.updatedAt,
      deletedAt: gameReviews.deletedAt,
    })
    .from(gameReviews)
    .leftJoin(users, eq(users.steamid, gameReviews.authorUserId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(gameReviews.publishedAt),
      desc(gameReviews.createdAt),
    );
  return rows.map((r) => ({
    ...r,
    pros: Array.isArray(r.pros) ? (r.pros as string[]) : [],
    cons: Array.isArray(r.cons) ? (r.cons as string[]) : [],
  }));
}

export async function getPublishedReviews(): Promise<GameReviewRow[]> {
  return selectRows({ publishedOnly: true, includeDeleted: false });
}

export async function getReviewBySlug(
  slug: string,
  options?: { allowDraft?: boolean },
): Promise<GameReviewRow | null> {
  const rows = await selectRows({
    publishedOnly: !options?.allowDraft,
    includeDeleted: !!options?.allowDraft,
    slug,
  });
  return rows[0] ?? null;
}

export async function getAllReviewsForAdmin(): Promise<GameReviewRow[]> {
  await requireCreator();
  return selectRows({ publishedOnly: false, includeDeleted: true });
}

function revalidateReview(slug: string) {
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${slug}`);
  revalidatePath("/admin/reviews");
}

export async function createGameReview(
  formData: FormData,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    const author = await requireCreator();
    const parsed = parseFields(formData);
    if (!parsed.ok) return parsed;
    const f = parsed.fields;
    const slug = await ensureUniqueSlug(f.slugBase);
    const publishNow = formData.get("publish") === "1";

    const db = getDb();
    await db.insert(gameReviews).values({
      slug,
      title: f.title,
      steamAppId: f.steamAppId,
      thumbnailUrl: f.thumbnailUrl,
      score: f.score,
      body: f.body,
      pros: f.pros,
      cons: f.cons,
      authorUserId: author.steamid,
      publishedAt: publishNow ? new Date() : null,
    });

    revalidateReview(slug);
    return { ok: true, slug };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function updateGameReview(
  formData: FormData,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    await requireCreator();
    const id = Number(String(formData.get("id") ?? ""));
    if (!Number.isInteger(id) || id <= 0)
      return { ok: false, error: "Invalid id." };
    const parsed = parseFields(formData);
    if (!parsed.ok) return parsed;
    const f = parsed.fields;
    const slug = await ensureUniqueSlug(f.slugBase, id);

    const db = getDb();
    await db
      .update(gameReviews)
      .set({
        slug,
        title: f.title,
        steamAppId: f.steamAppId,
        thumbnailUrl: f.thumbnailUrl,
        score: f.score,
        body: f.body,
        pros: f.pros,
        cons: f.cons,
        updatedAt: new Date(),
      })
      .where(eq(gameReviews.id, id));

    revalidateReview(slug);
    return { ok: true, slug };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function publishGameReview(formData: FormData): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(gameReviews)
    .set({ publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(gameReviews.id, id));
  revalidatePath("/reviews");
  revalidatePath("/admin/reviews");
}

export async function unpublishGameReview(formData: FormData): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(gameReviews)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(eq(gameReviews.id, id));
  revalidatePath("/reviews");
  revalidatePath("/admin/reviews");
}

export async function softDeleteGameReview(formData: FormData): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(gameReviews)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(gameReviews.id, id));
  revalidatePath("/reviews");
  revalidatePath("/admin/reviews");
}

export async function restoreGameReview(formData: FormData): Promise<void> {
  await requireCreator();
  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid_id");
  const db = getDb();
  await db
    .update(gameReviews)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(gameReviews.id, id));
  revalidatePath("/reviews");
  revalidatePath("/admin/reviews");
}

function friendlyError(err: unknown): string {
  const code = err instanceof Error ? err.message : "failed";
  if (code === "signed_out") return "You need to sign in.";
  if (code === "not_creator") return "Creator only.";
  if (code === "invalid_id") return "Invalid review id.";
  return code;
}

