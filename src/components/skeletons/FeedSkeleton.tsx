import { Skeleton } from "@/components/ui/skeleton";

export const FeedSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-[150px] mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[50%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

