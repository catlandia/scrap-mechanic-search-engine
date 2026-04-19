import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;

  return false;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  try {
    // Cron gets the adaptive config: dig up to 5 pages per kind but stop
    // early as soon as we've found 5 novel items. When the top of the
    // trending list is entirely already-decided / already-pending, this
    // keeps looking until we actually find new work — fixing the silent
    // "0 new items" runs that used to happen when the top of Workshop
    // was saturated with things we'd already processed.
    const result = await runIngest({
      pagesPerKind: 5,
      minNewPerKind: 5,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/ingest] failed:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
