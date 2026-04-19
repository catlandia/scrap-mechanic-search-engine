export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-foreground/10" />
        <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-80 max-w-full animate-pulse rounded bg-foreground/5" />
      </header>
      <nav className="flex gap-2 border-b border-border">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded bg-foreground/5"
          />
        ))}
      </nav>
      <ol className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="space-y-3 rounded-lg border border-border bg-card/60 px-5 py-4"
          >
            <div className="h-4 w-24 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-foreground/10" />
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-foreground/5" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-foreground/5" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-foreground/5" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
