import "server-only";
import { getDb } from "@/lib/db/client";
import { modActions, type User } from "@/lib/db/schema";

// Every mod-facing server action calls `logModAction` on success so
// /admin/audit has a single source of truth for "who did what, when".
// Never throws — a failed insert must not roll back the action the mod
// just took. Worst case a line is missing from the audit feed; the
// action itself already succeeded.

export interface LogArgs {
  actor: Pick<User, "steamid" | "personaName"> | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logModAction(args: LogArgs): Promise<void> {
  try {
    const db = getDb();
    await db.insert(modActions).values({
      actorUserId: args.actor?.steamid ?? null,
      actorName: args.actor?.personaName ?? null,
      action: args.action,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      summary: args.summary ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] logModAction failed:", err);
  }
}
