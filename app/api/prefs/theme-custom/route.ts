import { NextResponse, type NextRequest } from "next/server";
import {
  CUSTOM_THEME_KEYS,
  DEFAULT_CUSTOM_COLORS,
  type CustomThemeColors,
} from "@/lib/prefs";
import { setCustomThemeCookie, setThemeCookie } from "@/lib/prefs.server";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function POST(req: NextRequest) {
  const form = await req.formData();

  // Reset branch: explicit opt-out of the custom theme.
  if (form.get("reset") === "1") {
    await setCustomThemeCookie(DEFAULT_CUSTOM_COLORS);
    await setThemeCookie("default");
    return redirectBack(req, form);
  }

  const colors: Partial<CustomThemeColors> = {};
  for (const key of CUSTOM_THEME_KEYS) {
    const raw = String(form.get(key) ?? "").trim();
    if (!HEX.test(raw)) {
      return NextResponse.json(
        { error: `invalid_color:${key}` },
        { status: 400 },
      );
    }
    colors[key] = raw.toLowerCase();
  }

  await setCustomThemeCookie(colors as CustomThemeColors);
  await setThemeCookie("custom");
  return redirectBack(req, form);
}

function redirectBack(req: NextRequest, form: FormData) {
  const rawNext = String(form.get("next") ?? "/settings/theme");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/settings/theme";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
