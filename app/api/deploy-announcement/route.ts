import { NextResponse } from "next/server";
import { getActiveDeployAnnouncement } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Git SHA of the deployment actually serving this request. On Vercel this
// reflects the function's own deployment — so once Vercel has promoted the
// new build to production, this flips to the new SHA. Compared against the
// client's baked-in NEXT_PUBLIC_BUILD_ID to gate the banner's auto-reload:
// `complete-deploy.ts` stamps completedAt at the end of `next build`, but
// Vercel may still be uploading lambdas + warming the CDN for another 30s
// after that. Reloading on completedAt alone sometimes landed visitors
// back on the OLD bundle.
const SERVER_BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

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
      return NextResponse.json({
        active: false,
        serverNow,
        serverBuildId: SERVER_BUILD_ID,
      });
    }
    return NextResponse.json({
      active: true,
      id: announcement.id,
      scheduledAt: announcement.scheduledAt.toISOString(),
      completedAt: announcement.completedAt?.toISOString() ?? null,
      isPrank: announcement.isPrank,
      serverNow,
      serverBuildId: SERVER_BUILD_ID,
    });
  } catch {
    return NextResponse.json({
      active: false,
      serverNow,
      serverBuildId: SERVER_BUILD_ID,
    });
  }
}
