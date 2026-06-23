"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/prefs";
import { getDictionary, translate } from "./dictionaries";

// The context carries ONLY the locale string. The dictionaries module is
// already in the client bundle (translate/getDictionary are imported here, a
// "use client" module), so each consumer looks its dictionary up locally.
// Passing the full dict object down from the server layout used to serialize
// the entire ~600-key dictionary into the RSC/HTML payload on every request —
// the dominant per-request CPU cost that was tripping the Worker CPU limit.
const Ctx = createContext<Locale>("en");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useT() {
  const locale = useContext(Ctx);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string =>
      translate(getDictionary(locale), key, vars),
    [locale],
  );
  return { t, locale };
}
