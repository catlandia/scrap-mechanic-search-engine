import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  session.destroy();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export async function GET(req: NextRequest) {
  return POST(req);
}
