import { StatRowSkeleton } from "./StatRowSkeleton";
import { ChartSkeleton } from "./ChartSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatRowSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3"><ChartSkeleton height={320} /></div>
        <div className="lg:col-span-2"><ChartSkeleton height={320} /></div>
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
