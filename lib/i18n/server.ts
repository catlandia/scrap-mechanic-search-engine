import "server-only";
import { getLocale } from "@/lib/prefs.server";
import type { Locale } from "@/lib/prefs";
import { getDictionary, translate, type Dictionary } from "./dictionaries";

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export async function getT(): Promise<{ locale: Locale; dict: Dictionary; t: TFn }> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t: TFn = (key, vars) => translate(dict, key, vars);
  return { locale, dict, t };
}
