import { NextResponse } from "next/server";
import { getActiveDeployAnnouncement } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * Polled by the top-bar DeployBanner. Returns the currently-active deploy
 * announcement (if any) so the client can render a countdown, a
 * "deploying now" message, or an auto-reload trigger once completedAt is
 * stamped by the post-build step.
 */
export async function GET() {
  try {
    const announcement = await getActiveDeployAnnouncement();
    if (!announcement) {
      return NextResponse.json({ active: false });
    }
    return NextResponse.json({
      active: true,
      id: announcement.id,
      scheduledAt: announcement.scheduledAt.toISOString(),
      completedAt: announcement.completedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
