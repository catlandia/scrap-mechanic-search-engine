import { NextResponse } from "next/server";
import { getActiveDeployAnnouncement } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * Polled every few seconds by the top-bar DeployBanner. Returns the
 * currently-active deploy announcement (if any) so the client can render
 * a countdown without holding a websocket open. Responses are tiny —
 * scheduledAt ISO string plus a boolean — so the extra DB read is cheap
 * and caching upstream isn't worth the freshness trade-off.
 */
export async function GET() {
  try {
    const announcement = await getActiveDeployAnnouncement();
    if (!announcement) {
      return NextResponse.json({ active: false });
    }
    return NextResponse.json({
      active: true,
      scheduledAt: announcement.scheduledAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
