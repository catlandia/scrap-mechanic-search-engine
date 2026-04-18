import { NextResponse, type NextRequest } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth/steam-openid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawNext = req.nextUrl.searchParams.get("next") ?? "/";
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Always use the origin of the incoming request — NEXT_PUBLIC_SITE_URL can
  // go stale when Vercel rotates preview/deployment aliases and Steam will
  // redirect users back to a dead deployment. The request's own origin is
  // always reachable by definition.
  const origin = new URL(req.url).origin;
  const returnTo = new URL("/auth/steam/return", origin);
  returnTo.searchParams.set("next", next);

  const realm = new URL("/", origin).toString();
  const loginUrl = buildSteamLoginUrl(returnTo.toString(), realm);

  return NextResponse.redirect(loginUrl);
}
