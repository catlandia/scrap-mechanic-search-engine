import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { classifyError } from "@/lib/errors/codes";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        code: "CONFIG_MISSING",
        explanation:
          "The site is misconfigured — DATABASE_URL is not set on the server.",
      },
      { status: 500 },
    );
  }

  try {
    const sql = neon(url);
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const info = classifyError(err);
    return NextResponse.json(
      { ok: false, ...info },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
