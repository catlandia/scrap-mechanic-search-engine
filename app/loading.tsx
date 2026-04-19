import { GridSkeleton, HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton
        title="Loading…"
        subtitle="Fetching the latest creations."
      />
      <GridSkeleton count={8} />
    </div>
  );
}
