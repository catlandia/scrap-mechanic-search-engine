import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { creations } from "@/lib/db/schema";
import { classifyError } from "@/lib/errors/codes";

export const dynamic = "force-dynamic";

/**
 * Liveness probe.
 *
 * This deliberately goes through the same `getDb()` the pages use, rather than
 * opening a connection of its own. An earlier version dialled Postgres
 * directly, which meant it kept reporting `ok` while every page on the site
 * was failing — the two were not exercising the same path.
 *
 * Selecting from a real table (rather than `select 1`) also proves the `smse`
 * schema resolves, which is the part that silently breaks if the connection
 * loses its schema qualification.
 */
export async function GET() {
  try {
    const db = getDb();
    await db.select({ id: creations.id }).from(creations).limit(1);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error(
      "[health] db error:",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
    const info = classifyError(err);
    return NextResponse.json(
      { ok: false, ...info },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
