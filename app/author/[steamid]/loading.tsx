import { GridSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-foreground/10" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-foreground/10" />
          <div className="h-3 w-32 animate-pulse rounded bg-foreground/5" />
        </div>
      </header>
      <GridSkeleton count={8} />
    </div>
  );
}
