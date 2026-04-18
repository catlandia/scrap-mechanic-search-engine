import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  reports,
  creations,
  featureSuggestions,
} from "@/lib/db/schema";

// Each helper returns the count of writes in the given window. Callers compare
// against their own cap so the check and the error message stay co-located.

export async function countReportsByUserSince(
  userId: string,
  seconds: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.reporterUserId, userId),
        sql`${reports.createdAt} > now() - (${seconds} || ' seconds')::interval`,
      ),
    );
  return row?.n ?? 0;
}

export async function countReportsByUserForCreationSince(
  userId: string,
  creationId: string,
  seconds: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.reporterUserId, userId),
        eq(reports.creationId, creationId),
        sql`${reports.createdAt} > now() - (${seconds} || ' seconds')::interval`,
      ),
    );
  return row?.n ?? 0;
}

export async function countSubmissionsByUserSince(
  userId: string,
  seconds: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(creations)
    .where(
      and(
        eq(creations.uploadedByUserId, userId),
        sql`${creations.ingestedAt} > now() - (${seconds} || ' seconds')::interval`,
      ),
    );
  return row?.n ?? 0;
}

export async function countFeatureSuggestionsByUserSince(
  userId: string,
  seconds: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(featureSuggestions)
    .where(
      and(
        eq(featureSuggestions.submitterUserId, userId),
        sql`${featureSuggestions.createdAt} > now() - (${seconds} || ' seconds')::interval`,
      ),
    );
  return row?.n ?? 0;
}

// In-memory sliding-window counter. Per-instance only — acceptable for free-tier
// Hobby scale (restart drops state; a bad actor can still burn through up to
// N*instances events, but DB-backed caps protect the truly expensive actions).
const inMemoryEvents = new Map<string, number[]>();

export function isInMemoryRateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const events = inMemoryEvents.get(key) ?? [];
  const recent = events.filter((t) => t > cutoff);
  if (recent.length >= max) {
    inMemoryEvents.set(key, recent);
    return true;
  }
  recent.push(now);
  inMemoryEvents.set(key, recent);
  // Opportunistic cleanup so the Map doesn't grow unbounded across the
  // lifetime of the serverless instance.
  if (inMemoryEvents.size > 2000) {
    for (const [k, v] of inMemoryEvents) {
      const trimmed = v.filter((t) => t > cutoff);
      if (trimmed.length === 0) inMemoryEvents.delete(k);
      else inMemoryEvents.set(k, trimmed);
    }
  }
  return false;
}
