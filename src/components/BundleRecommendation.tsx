import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BundleRecommendationProps {
  listingId: string;
}

export const BundleRecommendation = ({ listingId }: BundleRecommendationProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bundle-suggestions', listingId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('buyer-agent-bundle-suggester', {
        body: { listingId }
      });
      
      if (error) throw error;
      return data?.data || { bundles: [] };
    },
  });

  const bundles = data?.bundles || [];

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-6 w-48 mb-3" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (bundles.length === 0) {
    return null;
  }

  const topBundle = bundles[0];

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Package className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">Bundle & Save</h4>
            <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              Save £{topBundle.total_savings.toFixed(2)}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {topBundle.reasoning}
          </p>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Bundle Price:</span>
              <span className="font-semibold">£{topBundle.total_price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Shipping:
              </span>
              <div className="flex items-center gap-2">
                <span className="line-through text-muted-foreground text-xs">
                  £{topBundle.original_shipping.toFixed(2)}
                </span>
                <span className="font-semibold">£{topBundle.bundle_shipping.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Bundle Discount:</span>
              <span className="text-green-600 font-semibold">
                -£{topBundle.bundle_discount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-semibold">Total:</span>
              <span className="text-lg font-bold text-primary">
                £{topBundle.final_price.toFixed(2)}
              </span>
            </div>
          </div>

          <Button className="w-full" size="sm">
            View Bundle ({topBundle.items.length} items)
          </Button>
        </div>
      </div>
    </Card>
  );
};
