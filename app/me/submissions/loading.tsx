import { GridSkeleton, HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton title="Your submissions" subtitle="Loading…" />
      <GridSkeleton count={6} />
    </div>
  );
}
