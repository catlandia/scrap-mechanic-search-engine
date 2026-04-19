import { GridSkeleton, HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton title="Loading…" />
      <GridSkeleton count={12} />
    </div>
  );
}
