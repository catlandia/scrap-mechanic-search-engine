"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitSuggestion } from "@/lib/suggestions/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

const MAX_IMAGE_BYTES = 500 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function SuggestionForm() {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUri(null);
      setImageName(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Image must be PNG, JPEG, WEBP, or GIF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(
        `Image is ${(file.size / 1024).toFixed(0)} KB — the limit is 500 KB. Try compressing or cropping first.`,
      );
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const uri = typeof reader.result === "string" ? reader.result : null;
      if (!uri || !uri.startsWith("data:")) {
        toast.error("Couldn't read the image file.");
        return;
      }
      setImageDataUri(uri);
      setImageName(file.name);
    };
    reader.onerror = () => toast.error("Couldn't read the image file.");
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageDataUri(null);
    setImageName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", body);
    if (imageDataUri) fd.append("image", imageDataUri);
    startTransition(async () => {
      const r = await submitSuggestion(fd);
      setResult(r);
      if (r.ok) {
        setTitle("");
        setBody("");
        clearImage();
        router.refresh();
        toast.success("Idea sent to the Creator.");
      } else if (r.error) {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/70">
            Short title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. Dark mode toggle on public pages"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/70">
            Details (optional)
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Why this matters, how you'd imagine it working, any edge cases."
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <div className="space-y-2">
          <span className="block text-sm text-foreground/70">
            Image (optional){" "}
            <span className="text-xs text-foreground/40">
              · PNG/JPEG/WEBP/GIF, 500 KB max
            </span>
          </span>
          {imageDataUri ? (
            <div className="flex items-start gap-3 rounded border border-border bg-background p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUri}
                alt="Attached preview"
                className="max-h-40 rounded border border-border"
              />
              <div className="flex flex-col gap-1 text-xs text-foreground/60">
                <span className="truncate">{imageName}</span>
                <button
                  type="button"
                  onClick={clearImage}
                  className="self-start text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={onImagePick}
              className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/30"
            />
          )}
          <p className="text-xs text-foreground/40">
            A mockup, screenshot, or sketch helps the Creator understand layout
            requests faster than words alone.
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-foreground/40">
          <span>{body.length}/2000</span>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {isPending && <Spinner size="sm" />}
            {isPending ? "Sending…" : "Send to Creator"}
          </button>
        </div>
      </form>

      {result?.ok && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Thanks — the Creator will review it. Approved suggestions appear on
          the public board.
        </div>
      )}
      {result && !result.ok && (
        <div
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {result.error}
        </div>
      )}
    </div>
  );
}
