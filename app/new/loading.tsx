import { GridSkeleton, HeaderSkeleton } from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton
        title="Newest additions"
        subtitle="Fresh approvals across every kind."
      />
      <GridSkeleton count={12} />
    </div>
  );
}
