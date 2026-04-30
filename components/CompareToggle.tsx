"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  COMPARE_EVENT,
  COMPARE_MAX,
  readCompareBasket,
  toggleCompare,
} from "@/lib/compare-basket";

export function CompareToggle({ creationId }: { creationId: string }) {
  const { t } = useT();
  const toast = useToast();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(readCompareBasket().includes(creationId));
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, [creationId]);

  function onClick() {
    const before = readCompareBasket();
    const after = toggleCompare(creationId);
    if (after.includes(creationId)) {
      toast.success(
        before.length >= COMPARE_MAX
          ? t("compare.replacedOldest")
          : t("compare.added"),
      );
    } else {
      toast.success(t("compare.removed"));
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition",
        active
          ? "border-accent/60 bg-accent/15 text-accent"
          : "border-border bg-card text-foreground/70 hover:border-accent/60 hover:text-accent",
      )}
      aria-pressed={active}
      title={active ? t("compare.removeAria") : t("compare.addAria")}
    >
      <span aria-hidden>↔</span>
      {active ? t("compare.inBasket") : t("compare.add")}
    </button>
  );
}
