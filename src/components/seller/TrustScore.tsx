import { useQuery } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrustScoreProps {
  sellerId: string;
  compact?: boolean;
}

export const TrustScore = ({ sellerId, compact = false }: TrustScoreProps) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("trust_score, verification_level, email_verified")
        .eq("id", sellerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery<{
    totalOrders: number;
    completedOrders: number;
    avgRating: number;
    totalRatings: number;
  }>({
    queryKey: ["seller-stats", sellerId],
    queryFn: async () => {
      // Get order stats
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status")
        .eq("seller_id", sellerId);

      if (ordersError) throw ordersError;

      // Get rating stats (reviews received by this seller)
      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("reviewee_id", sellerId);

      if (ratingsError) throw ratingsError;

      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter((o) => o.status === "delivered").length || 0;
      const ratingList = (ratings ?? []) as { rating: number | null }[];
      const avgRating =
        ratingList.length > 0
          ? ratingList.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingList.length
          : 0;

      return {
        totalOrders,
        completedOrders,
        avgRating,
        totalRatings: ratingList.length,
      };
    },
  });

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-8 w-24" />
    ) : (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const trustScore = profile?.trust_score || 50;
  const verificationLevel = profile?.verification_level || "unverified";

  const getTrustLevel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "text-green-500", bgColor: "bg-green-500/10" };
    if (score >= 75) return { label: "Very Good", color: "text-blue-500", bgColor: "bg-blue-500/10" };
    if (score >= 60) return { label: "Good", color: "text-yellow-500", bgColor: "bg-yellow-500/10" };
    if (score >= 40) return { label: "Fair", color: "text-orange-500", bgColor: "bg-orange-500/10" };
    return { label: "Needs Improvement", color: "text-red-500", bgColor: "bg-red-500/10" };
  };

  const trustLevel = getTrustLevel(trustScore);

  const verificationCount = profile?.email_verified ? 1 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Shield className={`h-4 w-4 ${trustLevel.color}`} />
        <span className={`text-sm font-medium ${trustLevel.color}`}>
          {trustScore}/100
        </span>
        {verificationLevel !== "unverified" && (
          <Badge className={`${trustLevel.bgColor} ${trustLevel.color} border-0 text-xs`}>
            {verificationLevel}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Trust Score
            </CardTitle>
            <CardDescription>
              Seller reputation and verification status
            </CardDescription>
          </div>
          <Badge className={`${trustLevel.bgColor} ${trustLevel.color} border-0`}>
            {trustLevel.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold">{trustScore}/100</span>
          </div>
          <Progress value={trustScore} className="h-2" />
        </div>

        {/* Verification Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Verification Level</span>
            <Badge variant="outline" className="capitalize">
              {verificationLevel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{verificationCount} verification{verificationCount !== 1 ? 's' : ''} completed</span>
            {verificationCount < 1 && (
              <span className="text-orange-500">• Complete verification for higher trust</span>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-2xl font-bold">{stats.completedOrders}</div>
              <div className="text-xs text-muted-foreground">Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                Rating ({stats.totalRatings})
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">{verificationCount}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </div>
        )}

        {/* Verification Status */}
        <div className="space-y-2 pt-2">
          <div className="text-sm font-medium">Verification Status</div>
          <div className="flex items-center gap-2 text-sm">
            {profile?.email_verified ? (
              <Shield className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={profile?.email_verified ? "text-foreground" : "text-muted-foreground"}>
              Email
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
