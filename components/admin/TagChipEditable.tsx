"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateTag } from "@/app/admin/actions";
import type { Category, Tag } from "@/lib/db/schema";

type SaveState = { ok: boolean; error: string | null };

const INITIAL: SaveState = { ok: false, error: null };

async function saveTag(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    await updateTag(formData);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "save failed" };
  }
}

export function TagChipEditable({
  tag,
  allCategories,
}: {
  // Narrowed Pick<> so callers that don't select V9.1's created_at columns
  // can still pass their rows through.
  tag: Pick<Tag, "id" | "slug" | "name" | "categoryId">;
  allCategories: Pick<Category, "id" | "slug" | "name" | "description">[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveTag, INITIAL);
  // Track the state reference of the last submission we acted on so re-opens
  // don't re-trigger the auto-close logic.
  const lastHandled = useRef<SaveState | null>(null);

  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <details
      className="group rounded-md border border-border bg-card/60 text-xs"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none rounded-md px-2.5 py-0.5 text-foreground/80 hover:bg-foreground/5 group-open:rounded-b-none group-open:border-b group-open:border-border">
        {tag.name} <span className="text-foreground/40">· {tag.slug}</span>
        <span className="ml-2 text-[10px] text-purple-300 group-open:hidden">
          edit
        </span>
      </summary>
      <form action={formAction} className="grid gap-2 p-3 sm:grid-cols-4">
        <input type="hidden" name="tagId" value={tag.id} />
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-foreground/40">
            Name
          </span>
          <input
            name="name"
            defaultValue={tag.name}
            required
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-foreground/40">
            Slug
          </span>
          <input
            name="slug"
            defaultValue={tag.slug}
            required
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-foreground/40">
            Category
          </span>
          <select
            name="categoryId"
            defaultValue={tag.categoryId ?? ""}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">— no category —</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-accent px-3 py-1 text-sm font-medium text-black hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
        {state.error && (
          <p
            role="alert"
            className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 sm:col-span-4"
          >
            {state.error}
          </p>
        )}
        <p className="text-[11px] text-amber-200/70 sm:col-span-4">
          Changing the slug breaks any existing{" "}
          <code>/search?tags=&lt;old-slug&gt;</code> link. Safe for fixing
          typos; be deliberate about renames.
        </p>
      </form>
    </details>
  );
}
