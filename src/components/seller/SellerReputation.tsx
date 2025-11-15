import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Star, Clock, Package, TrendingUp, Award } from "lucide-react";

interface SellerReputationProps {
  sellerId: string;
  compact?: boolean;
}

export const SellerReputation = ({ sellerId, compact = false }: SellerReputationProps) => {
  const { data: reputation } = useQuery({
    queryKey: ["seller-reputation", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reputation")
        .select("*")
        .eq("seller_id", sellerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["seller-badges", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_badges")
        .select("*")
        .eq("seller_id", sellerId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (!reputation) {
    return null;
  }

  const getVerificationBadge = (level: string) => {
    switch (level) {
      case "top_seller":
        return { label: "Top Seller", color: "bg-yellow-500", icon: "⭐" };
      case "trusted_seller":
        return { label: "Trusted Seller", color: "bg-blue-500", icon: "✓" };
      case "verified_seller":
        return { label: "Verified Seller", color: "bg-green-500", icon: "✓" };
      default:
        return null;
    }
  };

  const verificationBadge = getVerificationBadge(reputation.verification_level);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {verificationBadge && (
          <Badge className={`${verificationBadge.color} text-white`}>
            <Shield className="h-3 w-3 mr-1" />
            {verificationBadge.label}
          </Badge>
        )}
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{reputation.average_rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({reputation.total_reviews})</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {reputation.total_sales} sales
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reputation Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Reputation Score
              </CardTitle>
              <CardDescription>Overall seller performance rating</CardDescription>
            </div>
            {verificationBadge && (
              <Badge className={`${verificationBadge.color} text-white px-4 py-2 text-base`}>
                <Shield className="h-4 w-4 mr-2" />
                {verificationBadge.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold text-primary">
              {reputation.reputation_score}
            </span>
            <span className="text-sm text-muted-foreground">/ 1000</span>
          </div>
          <Progress value={reputation.reputation_score / 10} className="h-3" />
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Detailed seller statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                Average Rating
              </div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {reputation.average_rating.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground">
                  ({reputation.total_reviews} reviews)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Total Sales
              </div>
              <div className="text-2xl font-bold">{reputation.total_sales}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Response Time
              </div>
              <div className="text-2xl font-bold">
                {reputation.avg_response_time_hours}h
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Response Rate
              </div>
              <div className="text-2xl font-bold">
                {reputation.response_rate.toFixed(0)}%
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                On-Time Shipments
              </div>
              <div className="text-2xl font-bold">
                {reputation.total_sales > 0
                  ? ((reputation.on_time_shipments / reputation.total_sales) * 100).toFixed(0)
                  : 0}
                %
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Dispute Win Rate
              </div>
              <div className="text-2xl font-bold">
                {reputation.disputes_won + reputation.disputes_lost > 0
                  ? (
                      (reputation.disputes_won /
                        (reputation.disputes_won + reputation.disputes_lost)) *
                      100
                    ).toFixed(0)
                  : 100}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements & Badges
            </CardTitle>
            <CardDescription>Recognition for outstanding performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-3xl mb-2">
                    {badge.badge_type === "verification" && "🏆"}
                    {badge.badge_type === "milestone" && "🎯"}
                    {badge.badge_type === "quality" && "⭐"}
                    {badge.badge_type === "service" && "⚡"}
                  </div>
                  <div className="font-medium text-sm text-center">
                    {badge.badge_name}
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {badge.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Since */}
      <div className="text-sm text-muted-foreground text-center">
        Active seller since {new Date(reputation.active_since).toLocaleDateString()}
      </div>
    </div>
  );
};
