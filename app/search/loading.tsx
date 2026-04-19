import { GridSkeleton, HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton title="Search" subtitle="Loading results…" />
      <GridSkeleton count={8} />
    </div>
  );
}
