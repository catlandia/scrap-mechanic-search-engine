"use server";

import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { broadcastToRole } from "@/lib/db/notifications";
import { notifications } from "@/lib/db/schema";

// Age-gated users can't submit, comment, vote, or suggest. They need SOME
// channel to reach moderators — otherwise a legit user with a private Steam
// profile just hits a dead end. This action is deliberately NOT gated on
// requireVotingUser (which enforces the age gate); it only requires
// sign-in.

const MAX_REASON_LENGTH = 1000;
const DAILY_LIMIT = 1;

async function countRecentAppeals(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "mod_age_gate_appeal"),
        // The appellant's steamid lives in the link (`/admin/users?steamid=X`)
        // — simpler than adding an actorUserId column just for this count.
        sql`${notifications.link} like ${"%steamid=" + userId + "%"}`,
        sql`${notifications.createdAt} > now() - interval '24 hours'`,
      ),
    );
  return row?.n ?? 0;
}

export type AppealResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitAppeal(formData: FormData): Promise<AppealResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You need to sign in with Steam first." };
  }
  // Hard-banned users shouldn't be able to appeal — the hard ban already
  // blocks sign-in, so in practice `user` will be null for them, but belt-
  // and-braces.
  if (user.hardBanned) {
    return { ok: false, error: "Your account is blocked from this site." };
  }

  const reason = String(formData.get("reason") ?? "").trim().slice(0, MAX_REASON_LENGTH);
  if (reason.length < 20) {
    return {
      ok: false,
      error: "Please write at least a sentence or two explaining who you are and why you'd like access.",
    };
  }

  const recent = await countRecentAppeals(user.steamid);
  if (recent >= DAILY_LIMIT) {
    return {
      ok: false,
      error: "You already submitted an appeal in the last 24 hours. A moderator will respond — no need to send another.",
    };
  }

  await broadcastToRole({
    minRole: "moderator",
    tier: "moderator",
    type: "mod_age_gate_appeal",
    title: `Age-gate appeal from ${user.personaName}`,
    body: reason.slice(0, 300),
    link: `/admin/users?steamid=${user.steamid}`,
  });

  return { ok: true };
}
