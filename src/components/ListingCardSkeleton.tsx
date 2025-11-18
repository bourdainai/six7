import { Skeleton } from "@/components/ui/skeleton";

export const ListingCardSkeleton = () => {
  return (
    <div className="group text-left">
      <div className="aspect-[3/4] bg-soft-neutral border border-divider-gray overflow-hidden mb-3">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
};

