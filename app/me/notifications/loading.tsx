export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-64 animate-pulse rounded bg-foreground/5" />
      </div>
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex animate-pulse items-start gap-3 rounded-md border border-border bg-card/60 px-4 py-3"
          >
            <div className="size-2 shrink-0 translate-y-2 rounded-full bg-accent/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
              <div className="h-3 w-1/2 rounded bg-foreground/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
