import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { buildSessionOptions, type UserSession } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always open: auth flow, verify page, cron endpoints
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }

  // ── Bot check ──────────────────────────────────────────────────────────────
  // Every visitor must pass the captcha once (30-day cookie).
  const verified = req.cookies.get("bot_verified")?.value === "1";
  if (!verified) {
    const url = req.nextUrl.clone();
    url.pathname = "/verify";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Admin gate ─────────────────────────────────────────────────────────────
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth_error", "missing_secret");
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const session = await getIronSession<UserSession>(
    req,
    res,
    buildSessionOptions(password),
  );

  if (!session.steamid) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/steam/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on all routes except Next.js internals, static files, and captcha images
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|captcha/|logo\\.png).*)",
  ],
};
