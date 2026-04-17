import { NextResponse, type NextRequest } from "next/server";
import { getUserSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const session = await getUserSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", req.url));
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
