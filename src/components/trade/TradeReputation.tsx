import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Zap, Package } from "lucide-react";

// Simplified version to avoid TypeScript issues with Supabase types
export function TradeReputation({ userId, stats, badges }: { 
  userId: string;
  stats?: {
    total_trades_completed: number;
    avg_fairness_accepted: number;
    trade_completion_rate: number;
  };
  badges?: Array<{ badge_type: string; earned_at: string }>;
}) {
  const BADGE_CONFIG: Record<string, { Icon: any; label: string; color: string }> = {
    fair_trader: { Icon: Award, label: "Fair Trader", color: "bg-blue-500" },
    quick_responder: { Icon: Zap, label: "Quick Responder", color: "bg-yellow-500" },
    bundle_master: { Icon: Package, label: "Bundle Master", color: "bg-purple-500" },
    high_volume: { Icon: TrendingUp, label: "High Volume", color: "bg-green-500" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trading Reputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{stats?.total_trades_completed || 0}</div>
            <div className="text-xs text-muted-foreground">Completed Trades</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.avg_fairness_accepted?.toFixed(0) || 0}%</div>
            <div className="text-xs text-muted-foreground">Avg Fairness</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.trade_completion_rate?.toFixed(0) || 0}%</div>
            <div className="text-xs text-muted-foreground">Completion Rate</div>
          </div>
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Badges</h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const config = BADGE_CONFIG[badge.badge_type];
                if (!config) return null;
                const { Icon, label } = config;
                return (
                  <Badge key={badge.badge_type} variant="secondary" className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
