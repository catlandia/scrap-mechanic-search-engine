"use client";

import { useEffect, useState } from "react";
import "./globals.css";

// Hardcoded per-locale bundle. This file replaces the entire HTML tree on a
// fatal error, so the LocaleProvider isn't mounted and we can't read the
// dictionary through useT(). Instead the client peeks at the `smse_lang`
// cookie on mount and swaps the copy. The cookie is the same one the rest
// of the site uses (see lib/prefs.ts), with a safe English fallback.
const STRINGS = {
  en: {
    title: "Something went wrong.",
    body: "A fatal error prevented the page from loading. Please try again.",
    retry: "Try again",
  },
  ru: {
    title: "Что-то пошло не так.",
    body: "Критическая ошибка не позволила загрузить страницу. Попробуйте ещё раз.",
    retry: "Повторить",
  },
  uk: {
    title: "Щось пішло не так.",
    body: "Критична помилка не дозволила завантажити сторінку. Спробуйте ще раз.",
    retry: "Спробувати ще",
  },
  de: {
    title: "Etwas ist schiefgelaufen.",
    body: "Ein schwerwiegender Fehler verhinderte das Laden der Seite. Bitte versuche es erneut.",
    retry: "Erneut versuchen",
  },
  pl: {
    title: "Coś poszło nie tak.",
    body: "Krytyczny błąd uniemożliwił załadowanie strony. Spróbuj ponownie.",
    retry: "Spróbuj ponownie",
  },
  zh: {
    title: "出了点问题。",
    body: "致命错误导致页面无法加载。请重试。",
    retry: "重试",
  },
} as const;

type FatalLocale = keyof typeof STRINGS;

function readLocaleFromCookie(): FatalLocale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )smse_lang=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : "en";
  return (raw in STRINGS ? raw : "en") as FatalLocale;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Start with English on the server render, swap to the viewer's locale
  // once we can read document.cookie. Two-pass render is fine here —
  // fatal-error pages are rare and the flash is less jarring than
  // crashing the fallback itself.
  const [locale, setLocale] = useState<FatalLocale>("en");
  useEffect(() => {
    setLocale(readLocaleFromCookie());
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";
  const s = STRINGS[locale];

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
          <div className="w-full space-y-4 rounded-lg border border-border bg-card p-6 text-center">
            <div aria-hidden className="text-3xl">
              ⚠
            </div>
            <h1 className="text-xl font-semibold text-foreground">{s.title}</h1>
            <p className="text-sm text-foreground/70">{s.body}</p>
            {error.digest && (
              <p className="text-[11px] text-foreground/40">ref: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
            >
              {s.retry}
            </button>
            {isDev && (
              <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-left font-mono text-xs text-red-200">
                {error.message}
              </pre>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
