import { NextResponse, type NextRequest } from "next/server";
import { setFunModeCookie } from "@/lib/prefs.server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("on") ?? "");
  await setFunModeCookie(raw === "1" || raw === "true");
  const rawNext = String(form.get("next") ?? "/");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
