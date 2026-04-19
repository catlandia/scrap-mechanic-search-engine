// Generic "loading cards" placeholder — used by loading.tsx files for routes
// that render a grid of CreationCards. Keeps the header area stable while
// the server awaits DB queries, so users don't stare at a blank page.
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-border bg-card/60"
        >
          <div className="aspect-video bg-foreground/10" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-4/5 rounded bg-foreground/10" />
            <div className="h-3 w-2/3 rounded bg-foreground/5" />
            <div className="flex gap-2">
              <div className="h-3 w-14 rounded-full bg-foreground/5" />
              <div className="h-3 w-10 rounded-full bg-foreground/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HeaderSkeleton({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="space-y-1">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}
    </header>
  );
}
