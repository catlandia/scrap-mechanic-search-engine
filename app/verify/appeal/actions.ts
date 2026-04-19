"use server";

import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { broadcastToRole } from "@/lib/db/notifications";
import { notifications } from "@/lib/db/schema";

// Users with private Steam profiles can't prove their account age, so the
// age gate fail-closes them. They need SOME channel to reach moderators.
// This action is deliberately NOT gated on requireVotingUser (which
// enforces the age gate); it only requires sign-in.
//
// BUT the appeal is strictly for the "profile is private" case. A user
// whose timecreated IS readable and shows their account is genuinely
// less than 7 days old must wait out the gate like everyone else —
// otherwise a sock-puppet with a brand-new Steam account + private profile
// could appeal their way around the whole system.

const MAX_REASON_LENGTH = 1000;
const DAILY_LIMIT = 1;
const MIN_STEAM_AGE_DAYS = 7;

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

  // If the creator has already flipped bypassAgeGate, the user is past
  // the gate — no appeal needed.
  if (user.bypassAgeGate) {
    return {
      ok: false,
      error: "Your account is already past the age gate — nothing to appeal.",
    };
  }

  // If Steam exposes `timecreated` and the account is actually old enough,
  // the gate is already open for them. Nothing to appeal.
  if (user.steamCreatedAt) {
    const ageDays =
      (Date.now() - user.steamCreatedAt.getTime()) / 86_400_000;
    if (ageDays >= MIN_STEAM_AGE_DAYS) {
      return {
        ok: false,
        error:
          "Your Steam account is already at least 7 days old — you shouldn't need to appeal. Try signing out and back in; if you're still blocked please open a GitHub issue.",
      };
    }
    // Public profile, account genuinely < 7 days old. The 7-day rule exists
    // precisely to stop fresh sock-puppets; letting these users appeal would
    // gut it. Tell them the specific date they'll be through.
    const through = new Date(
      user.steamCreatedAt.getTime() + MIN_STEAM_AGE_DAYS * 86_400_000,
    );
    return {
      ok: false,
      error: `Your Steam account is less than 7 days old. The gate will lift on ${through.toLocaleDateString()}. This appeal path is for private Steam profiles only — please wait out the age check.`,
    };
  }

  // steamCreatedAt is null → private profile → legitimate appeal case.

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
