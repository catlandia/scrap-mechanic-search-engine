import { NextResponse } from "next/server";
import { getActiveDeployAnnouncement } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * Polled by the top-bar DeployBanner. Returns the currently-active deploy
 * announcement (if any) plus the server's current wall-clock time — every
 * poll lets clients correct for local clock skew so the countdown stays
 * synchronized across every tab regardless of what their device clock
 * says.
 */
export async function GET() {
  const serverNow = Date.now();
  try {
    const announcement = await getActiveDeployAnnouncement();
    if (!announcement) {
      return NextResponse.json({ active: false, serverNow });
    }
    return NextResponse.json({
      active: true,
      id: announcement.id,
      scheduledAt: announcement.scheduledAt.toISOString(),
      completedAt: announcement.completedAt?.toISOString() ?? null,
      isPrank: announcement.isPrank,
      serverNow,
    });
  } catch {
    return NextResponse.json({ active: false, serverNow });
  }
}
