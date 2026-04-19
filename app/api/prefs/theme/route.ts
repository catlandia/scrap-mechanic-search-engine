import { NextResponse, type NextRequest } from "next/server";
import { THEMES, type Theme } from "@/lib/prefs";
import { setThemeCookie } from "@/lib/prefs.server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("theme") ?? "");
  if (!(THEMES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "invalid_theme" }, { status: 400 });
  }
  await setThemeCookie(raw as Theme);
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
