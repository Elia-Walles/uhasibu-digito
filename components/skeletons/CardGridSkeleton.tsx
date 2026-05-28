import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 | 4 }) {
  const colsClass = cols === 2 ? "lg:grid-cols-2" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", colsClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="h-32" />
      ))}
    </div>
  );
}
