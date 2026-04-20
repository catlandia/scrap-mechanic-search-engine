import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, type Locale } from "@/lib/prefs";
import { setLocaleCookie } from "@/lib/prefs.server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("locale") ?? "");
  if (!(LOCALES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  await setLocaleCookie(raw as Locale);
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
