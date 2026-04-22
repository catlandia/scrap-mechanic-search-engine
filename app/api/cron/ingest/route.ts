import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest/pipeline";
import { refreshStaleCreators } from "@/lib/ingest/refresh";

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

    // Daily top-up pass on multi-creator attribution. The weekly refresh
    // cron bulk-drains 500 rows, this adds ~200 more per day so the
    // combined throughput keeps every approved row rescanned on a rolling
    // basis — under 2 weeks to cover a ~1000-item catalog and keep it
    // fresh afterwards. Each scrape takes ~200-800 ms wall time so 200
    // rows fit comfortably inside the 300 s function budget alongside
    // the ingest work above.
    let contributorsRefreshed = 0;
    try {
      contributorsRefreshed = await refreshStaleCreators(200);
    } catch (err) {
      // Contributor refresh is best-effort — never fail the ingest cron
      // over a creator-scrape hiccup. The next run retries.
      console.error("[cron/ingest] refreshStaleCreators failed:", err);
    }

    return NextResponse.json({ ok: true, ...result, contributorsRefreshed });
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
