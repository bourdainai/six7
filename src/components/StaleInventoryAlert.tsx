import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const StaleInventoryAlert = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['stale-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('seller-copilot-stale-detector');
      
      if (error) throw error;
      return data?.data || { staleListings: [], totalListings: 0, staleCount: 0 };
    },
    refetchInterval: 60000 * 30, // Check every 30 minutes
  });

  const staleListings = data?.staleListings || [];
  const staleCount = data?.staleCount || 0;

  if (isLoading || staleCount === 0) {
    return null;
  }

  const criticalListings = staleListings.filter((l: any) => l.stale_risk_score >= 70);

  return (
    <Card className="p-4 mb-6 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Stale Inventory Detected</h3>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
              {staleCount} items
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {criticalListings.length > 0
              ? `${criticalListings.length} item${criticalListings.length > 1 ? 's' : ''} urgently need attention`
              : 'Some items are not getting enough visibility'}
          </p>

          <div className="space-y-2 mb-4">
            {staleListings.slice(0, 2).map((listing: any) => (
              <div
                key={listing.id}
                className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {listing.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingDown className="w-3 h-3" />
                    <span>{listing.views_per_day} views/day</span>
                    <span>•</span>
                    <span>{listing.days_since_listed} days listed</span>
                  </div>
                  {listing.recommendations?.[0] && (
                    <p className="text-xs text-orange-600 mt-1">
                      → {listing.recommendations[0].message}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    listing.stale_risk_score >= 70
                      ? 'border-red-500 text-red-600'
                      : 'border-orange-500 text-orange-600'
                  }
                >
                  {listing.stale_risk_score}%
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/seller-dashboard')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              View All Stale Items
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
