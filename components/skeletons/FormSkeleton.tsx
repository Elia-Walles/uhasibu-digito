import { Skeleton } from "@/components/ui/Skeleton";

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-ud-border p-6 space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
