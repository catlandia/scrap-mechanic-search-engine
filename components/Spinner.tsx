import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<SpinnerSize, string> = {
  xs: "size-3 border-[1.5px]",
  sm: "size-4 border-2",
  md: "size-5 border-2",
  lg: "size-8 border-[3px]",
};

export function Spinner({
  size = "sm",
  className,
  label = "Loading",
  tone = "current",
}: {
  size?: SpinnerSize;
  className?: string;
  label?: string;
  /** `current` inherits text color; `accent` forces the brand spinner colour. */
  tone?: "current" | "accent" | "muted";
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-block", className)}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block animate-spin rounded-full border-solid border-transparent",
          tone === "current" && "border-current border-t-transparent",
          tone === "accent" && "border-accent border-t-transparent",
          tone === "muted" && "border-foreground/40 border-t-transparent",
          SIZE[size],
        )}
      />
      <span className="sr-only">{label}…</span>
    </span>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-foreground/60">
      <Spinner size="sm" />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-foreground/50">
      <Spinner size="lg" tone="accent" label={label} />
      <p className="text-sm">{label}…</p>
    </div>
  );
}
