import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { buildSessionOptions, type UserSession } from "@/lib/auth/session";

/**
 * Gate /admin/* behind a Steam login. We only check session presence here;
 * per-route role checks (mod, elite, creator) run inside the page or server
 * action where DB access is cheap.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth routes are always open; they're the login path itself.
  if (pathname.startsWith("/auth")) return NextResponse.next();
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
