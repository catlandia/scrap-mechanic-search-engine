"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import {
  COMPARE_EVENT,
  clearCompareBasket,
  readCompareBasket,
} from "@/lib/compare-basket";

// Floating bottom-right pill listing the current compare basket. Only
// renders once the visitor has accumulated at least one creation. Hidden
// on /compare itself so the bar doesn't sit on top of the table the user
// just navigated to.
export function CompareBasket() {
  const { t } = useT();
  const [ids, setIds] = useState<string[]>([]);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const sync = () => setIds(readCompareBasket());
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    // Cross-tab sync: localStorage events from another tab also update
    // this bar so the user sees a consistent basket everywhere.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMPARE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const updateHidden = () => {
      if (typeof window === "undefined") return;
      setHidden(window.location.pathname === "/compare");
    };
    updateHidden();
    // Next.js client navigations fire popstate but not pushState — listen for
    // both via a simple mutation observer on the URL pathname through a
    // periodic check. A 500ms tick is cheap and avoids depending on internal
    // Next.js APIs.
    const t = setInterval(updateHidden, 500);
    window.addEventListener("popstate", updateHidden);
    return () => {
      clearInterval(t);
      window.removeEventListener("popstate", updateHidden);
    };
  }, []);

  if (hidden || ids.length === 0) return null;

  const compareHref = `/compare?ids=${ids.join(",")}`;
  const canCompare = ids.length >= 2;

  return (
    <div
      className="fixed right-3 bottom-3 z-40 flex items-center gap-2 rounded-full border border-accent/40 bg-card/95 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
      role="region"
      aria-label="Compare basket"
    >
      <span aria-hidden>↔</span>
      <span className="text-foreground/80">
        {t("compare.basketLabel", { count: String(ids.length) })}
      </span>
      {canCompare ? (
        <Link
          href={compareHref}
          className="rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-black hover:bg-accent-strong"
        >
          {t("compare.openButton")}
        </Link>
      ) : (
        <span className="text-xs text-foreground/50">
          {t("compare.basketHint")}
        </span>
      )}
      <button
        type="button"
        onClick={() => clearCompareBasket()}
        className="text-foreground/50 hover:text-foreground"
        aria-label={t("compare.clearAria")}
      >
        ✕
      </button>
    </div>
  );
}
