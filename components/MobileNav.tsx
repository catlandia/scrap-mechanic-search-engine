"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RatingModeToggle } from "@/components/RatingModeToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { RatingMode, Theme } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };
type NavItem =
  | { kind: "link"; href: string; label: string; badge?: number }
  | { kind: "group"; label: string; items: NavLink[] };

export function MobileNav({
  navItems,
  ratingMode,
  theme,
  extraLinks,
  signedIn,
}: {
  navItems: NavItem[];
  ratingMode: RatingMode;
  theme: Theme;
  extraLinks: NavLink[];
  signedIn: boolean;
}) {
  // Search keeps its accent tile at the top of the drawer. Pull it out of
  // the nav items so it doesn't appear twice.
  const hasSearch = navItems.some(
    (i) => i.kind === "link" && i.href === "/search",
  );
  const itemsWithoutSearch = navItems.filter(
    (i) => !(i.kind === "link" && i.href === "/search"),
  );
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
    triggerRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-drawer-panel"
        onClick={() => setOpen((v) => !v)}
        /* Hardcoded zinc palette so the hamburger is always visible even
           under a pathological custom theme — this is the mobile entry
           point to the drawer where the theme-reset pill lives. */
        className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 lg:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5"
          aria-hidden
        >
          {open ? (
            <path
              fillRule="evenodd"
              d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M2.5 5.25A.75.75 0 0 1 3.25 4.5h13.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 4.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm.75 4a.75.75 0 0 0 0 1.5h13.5a.75.75 0 0 0 0-1.5H3.25z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </button>

      {open && mounted && createPortal(
        <div
          id="mobile-drawer-panel"
          className="fixed inset-0 z-[100] lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-l border-foreground/10 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
              <span className="text-xs uppercase tracking-widest text-foreground/50">
                Menu
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {hasSearch && (
              <div className="px-4 pt-3">
                <Link
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg border border-accent/50 bg-accent/15 px-4 py-3 text-base font-semibold text-accent transition hover:bg-accent/25"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 1 0 3.356 9.857l3.644 3.643a.75.75 0 1 0 1.06-1.06l-3.643-3.644A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Search the workshop</span>
                </Link>
              </div>
            )}

            <nav className="flex flex-col py-2 text-base">
              {itemsWithoutSearch.map((item) =>
                item.kind === "link" ? (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={pathname === item.href}
                    badge={item.badge}
                  />
                ) : (
                  <div key={item.label} className="mt-2">
                    <div className="px-4 py-1 text-[11px] uppercase tracking-widest text-foreground/40">
                      {item.label}
                    </div>
                    {item.items.map((sub) => (
                      <MobileLink
                        key={sub.href}
                        href={sub.href}
                        label={sub.label}
                        active={pathname === sub.href}
                        indented
                      />
                    ))}
                  </div>
                ),
              )}
            </nav>

            {extraLinks.length > 0 && (
              <>
                <div className="mx-4 border-t border-foreground/10" />
                <nav className="flex flex-col py-2 text-base">
                  {extraLinks.map((link) => (
                    <MobileLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      active={pathname === link.href}
                    />
                  ))}
                </nav>
              </>
            )}

            <div className="mx-4 border-t border-foreground/10" />
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/40">
                Ratings
              </div>
              <RatingModeToggle current={ratingMode} alwaysShow />
            </div>

            <div className="mx-4 border-t border-foreground/10" />
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/40">
                Theme
              </div>
              <ThemeToggle current={theme} />
              <Link
                href="/settings/theme"
                className="text-xs text-accent hover:underline"
              >
                Customize your theme →
              </Link>
            </div>

            {!signedIn && (
              <>
                <div className="mx-4 border-t border-foreground/10" />
                <div className="px-4 py-4">
                  {/* Plain <a>: server redirects to steamcommunity.com; <Link> prefetch would CORS-fail. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href="/auth/steam/login"
                    className="block rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-black hover:bg-accent-strong"
                  >
                    Sign in with Steam
                  </a>
                </div>
              </>
            )}

            {signedIn && (
              <>
                <div className="mx-4 border-t border-foreground/10" />
                <form
                  action="/auth/logout"
                  method="post"
                  className="px-4 py-4"
                >
                  <button
                    type="submit"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/60 hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function MobileLink({
  href,
  label,
  active,
  indented = false,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  indented?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 py-2.5 text-foreground/75 hover:bg-foreground/5 hover:text-foreground",
        indented ? "pl-8 pr-4 text-sm" : "px-4",
        active && "bg-accent/10 text-accent",
      )}
    >
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span
          aria-label={`${badge} unread`}
          className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black"
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
