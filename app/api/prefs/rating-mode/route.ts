import { NextResponse, type NextRequest } from "next/server";
import { RATING_MODES, type RatingMode } from "@/lib/prefs";
import { setRatingModeCookie } from "@/lib/prefs.server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("mode") ?? "");
  if (!(RATING_MODES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  await setRatingModeCookie(raw as RatingMode);
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
