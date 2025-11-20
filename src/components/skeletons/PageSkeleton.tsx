import { Skeleton } from "@/components/ui/skeleton";

export const PageSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-[250px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </div>
  );
};

