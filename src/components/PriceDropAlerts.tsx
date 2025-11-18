import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ListingSummary } from "@/types/listings";

interface PriceDrop {
  listing_id: string;
  old_price: number;
  new_price: number;
  discount_percentage: number;
  listing: Pick<ListingSummary, "id" | "title" | "brand" | "seller_price">;
}

interface PriceDropResponse {
  priceDrops: PriceDrop[];
}

export const PriceDropAlerts = () => {
  const navigate = useNavigate();

    const { data, isLoading } = useQuery<PriceDropResponse>({
    queryKey: ['price-drops'],
    queryFn: async () => {
        const { data, error } = await supabase.functions.invoke<PriceDropResponse>('buyer-agent-price-drop-detector');
      
      if (error) throw error;
        return data?.data || { priceDrops: [] };
    },
    refetchInterval: 60000 * 5, // Check every 5 minutes
  });

    const priceDrops = data?.priceDrops || [];

  if (isLoading || priceDrops.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-6 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <TrendingDown className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            Price Drops on Your Saved Items
            <Badge variant="secondary">{priceDrops.length}</Badge>
          </h3>
          <div className="space-y-2">
              {priceDrops.slice(0, 3).map((drop) => (
              <div
                key={drop.listing_id}
                className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {drop.listing.title}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-muted-foreground">
                      £{drop.old_price.toFixed(2)}
                    </span>
                    <span className="font-semibold text-orange-600">
                      £{drop.new_price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      -{drop.discount_percentage}%
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/listing/${drop.listing_id}`)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            ))}
          </div>
          {priceDrops.length > 3 && (
            <p className="text-sm text-muted-foreground mt-2">
              +{priceDrops.length - 3} more price drops
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
