import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, type NewUser, type UserRole } from "@/lib/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { verifySteamAssertion } from "@/lib/auth/steam-openid";
import {
  applyAutogrants,
  maybeAutoGrantBetatester,
} from "@/lib/badges/queries";
import {
  getPlayerSummary,
  getSmPlaytimeMinutes,
} from "@/lib/steam/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const params = url.searchParams;
  const rawNext = params.get("next") ?? "/";
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const failUrl = (code: string) => {
    const home = new URL("/", url);
    home.searchParams.set("auth_error", code);
    return NextResponse.redirect(home);
  };

  const steamid = await verifySteamAssertion(params);
  if (!steamid) {
    return failUrl("invalid_assertion");
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return failUrl("missing_api_key");

  const db = getDb();
  const creatorSteamid = process.env.CREATOR_STEAMID;
  const isCreator = creatorSteamid && creatorSteamid === steamid;

  // Fetch public profile + SM playtime (best-effort; tolerate failures).
  const [profile, playtime] = await Promise.all([
    getPlayerSummary(apiKey, steamid).catch(() => null),
    getSmPlaytimeMinutes(apiKey, steamid).catch(() => null),
  ]);

  const now = new Date();
  const baseRow: NewUser = {
    steamid,
    personaName: profile?.personaname ?? `user_${steamid.slice(-5)}`,
    avatarUrl: profile?.avatarfull ?? profile?.avatarmedium ?? null,
    profileUrl: profile?.profileurl ?? null,
    steamCreatedAt:
      typeof profile?.timecreated === "number"
        ? new Date(profile.timecreated * 1000)
        : null,
    smPlaytimeMinutes: playtime,
    lastSeenAt: now,
  };

  // Existing-user lookup (to preserve their current role unless creator promotion applies).
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.steamid, steamid))
    .limit(1);

  // Hard-banned steamids can't sign in. Session never gets set.
  if (existing[0]?.hardBanned) {
    return failUrl("hard_banned");
  }

  const existingRole = existing[0]?.role as UserRole | undefined;
  const nextRole: UserRole = isCreator
    ? "creator"
    : existingRole ?? "user";

  const siteJoinedAt = existing[0]?.siteJoinedAt ?? now;
  if (existing.length === 0) {
    await db.insert(users).values({
      ...baseRow,
      role: nextRole,
      siteJoinedAt: now,
    });
  } else {
    await db
      .update(users)
      .set({
        personaName: baseRow.personaName,
        avatarUrl: baseRow.avatarUrl,
        profileUrl: baseRow.profileUrl,
        steamCreatedAt: baseRow.steamCreatedAt,
        smPlaytimeMinutes: baseRow.smPlaytimeMinutes,
        lastSeenAt: now,
        role: nextRole,
      })
      .where(eq(users.steamid, steamid));
  }

  // Best-effort: never let a badge grant failure block the sign-in flow.
  try {
    await Promise.all([
      maybeAutoGrantBetatester(steamid, siteJoinedAt),
      applyAutogrants(steamid),
    ]);
  } catch (err) {
    console.error("badge auto-grant failed:", err);
  }

  const session = await getUserSession();
  session.steamid = steamid;
  await session.save();

  return NextResponse.redirect(new URL(next, url));
}
