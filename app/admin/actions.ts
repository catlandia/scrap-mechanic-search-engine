"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  creationCategories,
  creationTags,
  creations,
  tags,
} from "@/lib/db/schema";
import { runIngest } from "@/lib/ingest/pipeline";
import { CREATION_KINDS } from "@/lib/db/schema";

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

export async function triggerIngest(): Promise<void> {
  await runIngest({});
  revalidatePath("/admin/queue");
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
