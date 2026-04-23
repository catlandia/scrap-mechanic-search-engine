"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCreationKind } from "@/app/admin/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { CREATION_KINDS, type CreationKind } from "@/lib/db/schema";

const KIND_LABELS: Record<CreationKind, string> = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge Pack",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain Asset",
  other: "Other",
};

export function CreationKindPicker({
  creationId,
  currentKind,
}: {
  creationId: string;
  currentKind: CreationKind;
}) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<CreationKind>(currentKind);
  const [isPending, startTransition] = useTransition();

  function onChange(next: CreationKind) {
    if (next === kind) return;
    const previous = kind;
    setKind(next); // optimistic
    const fd = new FormData();
    fd.append("creationId", creationId);
    fd.append("kind", next);
    startTransition(async () => {
      try {
        await setCreationKind(fd);
        toast.success(`Kind changed to ${KIND_LABELS[next]}.`);
        router.refresh();
      } catch (err) {
        setKind(previous);
        const msg = err instanceof Error ? err.message : "failed";
        toast.error(`Could not change kind: ${msg}`);
      }
    });
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200">
      <span className="font-semibold uppercase tracking-wider">Kind</span>
      <select
        value={kind}
        onChange={(e) => onChange(e.target.value as CreationKind)}
        disabled={isPending}
        className="rounded border border-purple-400/30 bg-background/70 px-2 py-0.5 text-xs text-foreground disabled:opacity-50"
        aria-label="Change this creation's kind"
      >
        {CREATION_KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABELS[k]}
          </option>
        ))}
      </select>
      {isPending && <Spinner size="xs" />}
    </label>
  );
}
