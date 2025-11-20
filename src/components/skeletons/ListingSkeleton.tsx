import { Skeleton } from "@/components/ui/skeleton";

export const ListingSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery Skeleton */}
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        </div>

        {/* Details Skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[80%]" />
            <Skeleton className="h-4 w-[40%]" />
          </div>

          <Skeleton className="h-12 w-[30%]" />

          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>

          <div className="space-y-2 pt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
          </div>
        </div>
      </div>
    </div>
  );
};

