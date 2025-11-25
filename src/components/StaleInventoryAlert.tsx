import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

interface StaleListing {
  id: string;
  title: string;
  created_at: string;
  views: number;
  stale_risk_score: number;
  days_since_listed: number;
  views_per_day: number;
}

export const StaleInventoryAlert = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['stale-inventory-simple', user?.id],
    queryFn: async () => {
      if (!user) return { staleListings: [], staleCount: 0 };

      // Get listings older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, title, created_at, views, saves')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Calculate simple stale risk scores
      const staleListings = (listings || [])
        .map((listing) => {
          const createdDate = new Date(listing.created_at);
          const daysSinceListed = Math.floor(
            (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const viewsPerDay = daysSinceListed > 0 ? listing.views / daysSinceListed : 0;

          // Simple scoring: older + fewer views = higher risk
          let staleRiskScore = 0;
          
          if (daysSinceListed > 90) staleRiskScore += 40;
          else if (daysSinceListed > 60) staleRiskScore += 30;
          else if (daysSinceListed > 30) staleRiskScore += 20;

          if (viewsPerDay < 0.5) staleRiskScore += 30;
          else if (viewsPerDay < 1) staleRiskScore += 20;
          else if (viewsPerDay < 2) staleRiskScore += 10;

          if (listing.views < 10) staleRiskScore += 20;
          if (listing.saves === 0) staleRiskScore += 10;

          return {
            id: listing.id,
            title: listing.title,
            created_at: listing.created_at,
            views: listing.views,
            stale_risk_score: staleRiskScore,
            days_since_listed: daysSinceListed,
            views_per_day: viewsPerDay.toFixed(1),
          };
        })
        .filter((l) => l.stale_risk_score >= 50) // Only show if score >= 50
        .sort((a, b) => b.stale_risk_score - a.stale_risk_score);

      return {
        staleListings,
        staleCount: staleListings.length,
      };
    },
    enabled: !!user,
    // No auto-refresh to save resources
  });

  const staleListings = data?.staleListings || [];
  const staleCount = data?.staleCount || 0;

  if (isLoading || staleCount === 0) {
    return null;
  }

  const criticalListings = staleListings.filter((l) => l.stale_risk_score >= 70);

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
            {staleListings.slice(0, 2).map((listing) => (
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
                  <p className="text-xs text-orange-600 mt-1">
                    → Consider reducing price or updating photos
                  </p>
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
