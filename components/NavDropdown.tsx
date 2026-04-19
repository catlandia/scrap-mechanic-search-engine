"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = items.some((i) => pathname === i.href);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          isActive ? "text-foreground" : "text-foreground/70",
        )}
      >
        {label}
        <span aria-hidden className="text-[10px] leading-none">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border bg-background/95 py-1 shadow-lg backdrop-blur"
        >
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              role="menuitem"
              className={cn(
                "block px-3 py-1.5 text-sm hover:bg-foreground/10 hover:text-foreground",
                pathname === i.href
                  ? "text-accent"
                  : "text-foreground/75",
              )}
            >
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
