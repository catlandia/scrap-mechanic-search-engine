import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { buildSessionOptions, type AdminSession } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/admin/logout")) {
    return NextResponse.next();
  }

  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "missing-secret");
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, buildSessionOptions(password));
  if (!session.isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
