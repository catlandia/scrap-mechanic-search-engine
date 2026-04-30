import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Lookup endpoint for the browser extension. Given a Steam workshop
// publishedfileid, returns whether SMSE has it (and if so, where to find
// it). CORS is wide-open because the extension's content script runs on
// steamcommunity.com and needs to call us cross-origin; the response
// contains nothing private so this is safe.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const steamId = url.searchParams.get("steamId")?.trim() ?? "";

  if (!/^\d{1,25}$/.test(steamId)) {
    return Response.json(
      { ok: false, error: "invalid steamId" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: creations.id,
      shortId: creations.shortId,
      title: creations.title,
      kind: creations.kind,
      status: creations.status,
    })
    .from(creations)
    .where(eq(creations.id, steamId))
    .limit(1);

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://scrap-mechanic-search-engine.vercel.app";

  if (!row) {
    return Response.json(
      {
        ok: true,
        exists: false,
        steamId,
        submitUrl: `${site}/submit?steam=${steamId}`,
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  }

  return Response.json(
    {
      ok: true,
      exists: true,
      steamId,
      status: row.status,
      title: row.title,
      kind: row.kind,
      url: `${site}/creation/${row.shortId ?? row.id}`,
      submitUrl: `${site}/submit?steam=${steamId}`,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
