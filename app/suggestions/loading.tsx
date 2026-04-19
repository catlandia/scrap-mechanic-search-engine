export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-foreground/10" />
          <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
          <div className="h-3 w-80 max-w-full animate-pulse rounded bg-foreground/5" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-md bg-foreground/10" />
      </header>
      <nav className="flex gap-2 border-b border-border">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded bg-foreground/5"
          />
        ))}
      </nav>
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex animate-pulse gap-4 rounded-lg border border-border bg-card/60 p-4"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="size-8 rounded-md bg-foreground/10" />
              <div className="h-4 w-8 rounded bg-foreground/10" />
              <div className="size-8 rounded-md bg-foreground/10" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-foreground/10" />
              <div className="h-3 w-full rounded bg-foreground/5" />
              <div className="h-3 w-3/4 rounded bg-foreground/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
