import { NextResponse, type NextRequest } from "next/server";
import { RATING_MODES, setRatingModeCookie, type RatingMode } from "@/lib/prefs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("mode") ?? "");
  if (!(RATING_MODES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  await setRatingModeCookie(raw as RatingMode);
  const next = String(form.get("next") ?? "/");
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
