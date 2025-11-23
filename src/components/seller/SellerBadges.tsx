import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Star,
  Truck,
  Award,
  Shield,
  Sparkles,
  Mail,
  Zap,
  Linkedin,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SellerBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  description: string | null;
  icon_url: string | null;
  earned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface SellerVerification {
  id: string;
  verification_type: string;
  status: string;
  verified_at: string | null;
}

interface SellerBadgesProps {
  sellerId: string;
  showVerifications?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const badgeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  verified_seller: CheckCircle2,
  top_seller: Star,
  fast_shipper: Truck,
  excellent_rating: Award,
  trusted_seller: Shield,
  new_seller: Sparkles,
  power_seller: Zap,
  email_verified: Mail,
  linkedin_verified: Linkedin,
  facebook_verified: Facebook,
  instagram_verified: Instagram,
  twitter_verified: Twitter,
  stripe_verified: Shield,
};

const badgeColors: Record<string, string> = {
  verified_seller: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  top_seller: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  fast_shipper: "bg-green-500/10 text-green-500 border-green-500/20",
  excellent_rating: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  trusted_seller: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  new_seller: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  power_seller: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  email_verified: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  linkedin_verified: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  facebook_verified: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  instagram_verified: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  twitter_verified: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  stripe_verified: "bg-green-500/10 text-green-500 border-green-500/20",
};

export const SellerBadges = ({
  sellerId,
  showVerifications = true,
  size = "md",
  className = ""
}: SellerBadgesProps) => {
  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ["seller-badges", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_badges")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SellerBadge[];
    },
  });

  const { data: verifications, isLoading: verificationsLoading } = useQuery({
    queryKey: ["seller-verifications", sellerId],
    enabled: showVerifications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("status", "verified")
        .order("verified_at", { ascending: false });

      if (error) throw error;
      return data as SellerVerification[];
    },
  });

  if (badgesLoading || verificationsLoading) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
    );
  }

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const badgeSize = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";

  return (
    <TooltipProvider>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {/* Verification Badges */}
        {showVerifications && verifications && verifications.length > 0 && (
          <>
            {verifications.map((verification) => {
              const badgeType = `${verification.verification_type}_verified`;
              const Icon = badgeIcons[badgeType] || CheckCircle2;
              const colorClass = badgeColors[badgeType] || badgeColors.email_verified;

              return (
                <Tooltip key={verification.id}>
                  <TooltipTrigger asChild>
                    <Badge className={`${colorClass} ${badgeSize} flex items-center gap-1`}>
                      <Icon className={iconSize} />
                      <span className="capitalize">{verification.verification_type}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      {verification.verification_type === "email" && "Email verified"}
                      {verification.verification_type === "linkedin" && "LinkedIn profile verified"}
                      {verification.verification_type === "facebook" && "Facebook profile verified"}
                      {verification.verification_type === "instagram" && "Instagram profile verified"}
                      {verification.verification_type === "twitter" && "Twitter/X profile verified"}
                      {verification.verified_at && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          Verified {new Date(verification.verified_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </>
        )}

        {/* Performance Badges */}
        {badges && badges.length > 0 && (
          <>
            {badges.map((badge) => {
              const Icon = badgeIcons[badge.badge_type] || Award;
              const colorClass = badgeColors[badge.badge_type] || badgeColors.trusted_seller;

              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <Badge className={`${colorClass} ${badgeSize} flex items-center gap-1`}>
                      <Icon className={iconSize} />
                      <span>{badge.badge_name}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{badge.badge_name}</p>
                      {badge.description && (
                        <p className="text-muted-foreground mt-1">{badge.description}</p>
                      )}
                      {badge.earned_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {new Date(badge.earned_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
