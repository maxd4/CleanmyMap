import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 md:grid-cols-2">
        <CmmSkeleton className="h-32" />
        <CmmSkeleton className="h-32" />
      </div>
      <CmmSkeleton className="h-24" />
    </div>
  );
}
