"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/prefs";
import { translate, type Dictionary } from "./dictionaries";

interface LocaleCtx {
  locale: Locale;
  dict: Dictionary;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  const ctx = useContext(Ctx);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      if (!ctx) return key;
      return translate(ctx.dict, key, vars);
    },
    [ctx],
  );
  return { t, locale: ctx?.locale ?? "en" };
}
