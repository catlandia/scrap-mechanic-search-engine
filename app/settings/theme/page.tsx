import type { Metadata } from "next";
import Link from "next/link";
import {
  CUSTOM_THEME_KEYS,
  DEFAULT_CUSTOM_COLORS,
  type CustomThemeKey,
} from "@/lib/prefs";
import { getCustomThemeColors, getTheme } from "@/lib/prefs.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your theme",
  description: "Pick your own colour palette for the site.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings/theme" },
};

const FIELD_LABELS: Record<CustomThemeKey, { label: string; hint: string }> = {
  background: {
    label: "Background",
    hint: "Main surface behind everything.",
  },
  foreground: {
    label: "Text",
    hint: "Default text colour. Needs to contrast the background.",
  },
  card: {
    label: "Card",
    hint: "Surface for cards, forms, and list items.",
  },
  accent: {
    label: "Accent",
    hint: "Links, buttons, highlights. The brand colour.",
  },
  border: {
    label: "Border",
    hint: "Thin lines between sections and cards.",
  },
};

export default async function CustomThemePage() {
  const [currentTheme, saved] = await Promise.all([
    getTheme(),
    getCustomThemeColors(),
  ]);
  const colors = saved ?? DEFAULT_CUSTOM_COLORS;

  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm text-foreground/80">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">Theme</p>
        <h1 className="text-3xl font-bold text-foreground">Your theme</h1>
        <p className="text-foreground/60">
          Pick five colours and save. This becomes the{" "}
          <strong>Your theme</strong> option in the theme picker. The built-in
          themes are never overwritten — if you make everything one colour by
          accident, switch back to <strong>Default</strong> from the theme
          pill in the header and try again.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card/60 p-4">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-foreground/50">
          Current theme
        </h2>
        <p>
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-foreground">
            {currentTheme}
          </code>
          {currentTheme === "custom" ? (
            <span className="ml-2 text-foreground/60">
              — your theme is active.
            </span>
          ) : (
            <span className="ml-2 text-foreground/60">
              — saving below will switch you to your theme.
            </span>
          )}
        </p>
      </section>

      <form
        action="/api/prefs/theme-custom"
        method="post"
        className="space-y-4"
      >
        <input type="hidden" name="next" value="/settings/theme" />
        <div className="grid gap-3 sm:grid-cols-2">
          {CUSTOM_THEME_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
            >
              <input
                type="color"
                name={key}
                defaultValue={colors[key]}
                className="size-10 cursor-pointer rounded border border-border bg-transparent"
                aria-label={FIELD_LABELS[key].label}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {FIELD_LABELS[key].label}
                  </span>
                  <code className="font-mono text-[11px] text-foreground/50">
                    {colors[key]}
                  </code>
                </div>
                <p className="text-xs text-foreground/50">
                  {FIELD_LABELS[key].hint}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
          >
            Save &amp; apply
          </button>
          {/* Hardcoded zinc palette — survives even a all-same-colour
              custom theme so the user can always escape. */}
          <button
            type="submit"
            name="reset"
            value="1"
            formNoValidate
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            Reset to default
          </button>
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm text-foreground/50 hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>

    </article>
  );
}
