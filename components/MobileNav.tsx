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

export function MobileNav({
  navLinks,
  ratingMode,
  theme,
  extraLinks,
  signedIn,
}: {
  navLinks: NavLink[];
  ratingMode: RatingMode;
  theme: Theme;
  extraLinks: NavLink[];
  signedIn: boolean;
}) {
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
        className="inline-flex size-9 items-center justify-center rounded-md border border-border text-white/70 hover:text-white sm:hidden"
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
          className="fixed inset-0 z-[100] sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-xs uppercase tracking-widest text-white/50">
                Menu
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white"
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

            <nav className="flex flex-col py-2 text-base">
              {navLinks.map((link) => (
                <MobileLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={pathname === link.href}
                />
              ))}
            </nav>

            {extraLinks.length > 0 && (
              <>
                <div className="mx-4 border-t border-white/10" />
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

            <div className="mx-4 border-t border-white/10" />
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-white/40">
                Ratings
              </div>
              <RatingModeToggle current={ratingMode} />
            </div>

            <div className="mx-4 border-t border-white/10" />
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-widest text-white/40">
                Theme
              </div>
              <ThemeToggle current={theme} />
            </div>

            {!signedIn && (
              <>
                <div className="mx-4 border-t border-white/10" />
                <div className="px-4 py-4">
                  <Link
                    href="/auth/steam/login"
                    className="block rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-black hover:bg-accent-strong"
                  >
                    Sign in with Steam
                  </Link>
                </div>
              </>
            )}

            {signedIn && (
              <>
                <div className="mx-4 border-t border-white/10" />
                <form
                  action="/auth/logout"
                  method="post"
                  className="px-4 py-4"
                >
                  <button
                    type="submit"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white/60 hover:text-white"
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
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2.5 text-white/75 hover:bg-white/5 hover:text-white",
        active && "bg-accent/10 text-accent",
      )}
    >
      {label}
    </Link>
  );
}
