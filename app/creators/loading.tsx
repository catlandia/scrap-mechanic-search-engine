import { HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <section className="space-y-6">
      <HeaderSkeleton
        title="Creators"
        subtitle="Loading the creator directory…"
      />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <li
            key={i}
            className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5"
          >
            <div className="size-9 shrink-0 rounded-full bg-foreground/10" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-foreground/10" />
              <div className="h-2.5 w-1/2 rounded bg-foreground/5" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
