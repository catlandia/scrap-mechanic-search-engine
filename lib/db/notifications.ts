import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  notifications,
  users,
  type NotificationTier,
  type UserRole,
} from "./schema";
import { ROLE_HIERARCHY } from "@/lib/auth/roles";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  tier?: NotificationTier;
}) {
  try {
    const db = getDb();
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      tier: params.tier ?? "user",
    });
  } catch {
    // Notifications are best-effort — never let a failed insert break a user action.
  }
}

/**
 * Fan out a single tier-tagged notification to every user whose role is at
 * least `minRole` AND isn't currently time-banned. Optionally skip a specific
 * steamid (the actor triggering the event shouldn't notify themselves).
 *
 * Intentionally per-recipient inserts — keeps the existing schema (userId
 * NOT NULL) and keeps every mod/elite/creator's notification list personal.
 */
export async function broadcastToRole(params: {
  minRole: Exclude<UserRole, "user">;
  tier: NotificationTier;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  excludeUserId?: string | null;
}) {
  try {
    const db = getDb();
    const minIdx = ROLE_HIERARCHY.indexOf(params.minRole);
    if (minIdx < 0) return;
    const eligibleRoles = ROLE_HIERARCHY.slice(minIdx);
    const recipients = await db
      .select({ steamid: users.steamid })
      .from(users)
      .where(
        and(
          inArray(users.role, eligibleRoles),
          sql`(${users.bannedUntil} is null or ${users.bannedUntil} <= now())`,
          eq(users.hardBanned, false),
        ),
      );
    const rows = recipients
      .filter((r) => !params.excludeUserId || r.steamid !== params.excludeUserId)
      .map((r) => ({
        userId: r.steamid,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
        tier: params.tier,
      }));
    if (rows.length === 0) return;
    await db.insert(notifications).values(rows);
  } catch {
    // Best-effort — don't break the calling action.
  }
}

