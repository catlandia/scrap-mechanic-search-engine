import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/steam/login", req.url));
  }
  if (!Number.isFinite(numericId)) {
    return NextResponse.redirect(new URL("/me/notifications", req.url));
  }
  const result = await markNotificationRead(user.steamid, numericId);
  const target = result?.link ?? "/me/notifications";
  return NextResponse.redirect(new URL(target, req.url));
}
