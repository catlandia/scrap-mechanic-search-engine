import { NextResponse, type NextRequest } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth/steam-openid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("next") ?? "/";
  // Only allow same-site redirects after login.
  const next = requested.startsWith("/") ? requested : "/";

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const returnTo = new URL("/auth/steam/return", origin);
  returnTo.searchParams.set("next", next);

  const realm = new URL("/", origin).toString();
  const loginUrl = buildSteamLoginUrl(returnTo.toString(), realm);

  return NextResponse.redirect(loginUrl);
}
