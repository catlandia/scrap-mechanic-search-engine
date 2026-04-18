import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { buildSessionOptions, type UserSession } from "@/lib/auth/session";
import {
  botVerifiedSessionOptions,
  type BotVerifiedSession,
} from "@/lib/captcha/verified-session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Captcha gate: only on the Steam login entry point.
  // Visitors can browse freely; the check happens when they try to log in.
  if (pathname === "/auth/steam/login") {
    const password = process.env.SESSION_SECRET;
    let verified = false;
    if (password && password.length >= 32) {
      const res = NextResponse.next();
      const session = await getIronSession<BotVerifiedSession>(
        req,
        res,
        botVerifiedSessionOptions(password),
      );
      verified = session.verified === true;
    }
    if (!verified) {
      const url = req.nextUrl.clone();
      url.pathname = "/verify";
      url.searchParams.set("next", pathname + (req.nextUrl.search ?? ""));
      return NextResponse.redirect(url);
    }
  }

  // All other /auth/* routes (callback, logout) are always open.
  if (pathname.startsWith("/auth")) return NextResponse.next();

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
  matcher: ["/admin/:path*", "/auth/:path*"],
};
