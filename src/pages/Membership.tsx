import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";

interface MembershipData {
  subscribed: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  promo_active: boolean;
  promo_expiry?: string;
  subscription_end?: string;
  monthly_gmv: number;
}

const Membership = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Check membership status
  const { data: membership, refetch } = useQuery({
    queryKey: ["membership", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;
      return data as MembershipData;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    // Refetch on page load
    refetch();
  }, [refetch]);

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upgrade your membership",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error creating checkout:", error);
      }
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error opening customer portal:", error);
      }
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-3xl font-light text-foreground mb-4">Membership</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view membership options</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </PageLayout>
    );
  }

  const currentTier = membership?.tier || 'free';
  const isProActive = membership?.promo_active || (currentTier === 'pro' && membership?.subscribed);
  const gmvRemaining = Math.max(0, 1000 - (membership?.monthly_gmv || 0));

  return (
    <PageLayout>
      <SEO
        title="Membership Plans | Pro & Enterprise Seller Plans | 6Seven"
        description="Upgrade your 6Seven seller account with Pro or Enterprise membership. Get lower fees, priority support, advanced analytics, and more selling tools."
        keywords="6Seven membership, seller membership, pro seller, enterprise seller, marketplace membership, seller subscription, lower fees, seller tools"
        url="https://6seven.ai/membership"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "6Seven Membership Plans",
          "description": "Choose a membership plan to enhance your selling experience",
          "url": "https://6seven.ai/membership"
        }}
      />
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Choose Your Membership
          </h1>
          <p className="text-base text-muted-foreground font-normal tracking-tight">
            Unlock exclusive benefits and grow your business
          </p>
        </div>

        {/* Current Status Banner */}
        {isProActive && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">You're on Pro Membership</p>
                    {membership?.promo_active && (
                      <p className="text-sm text-muted-foreground">
                        Promotional period ends {new Date(membership.promo_expiry!).toLocaleDateString()}
                      </p>
                    )}
                    {membership?.subscription_end && !membership?.promo_active && (
                      <p className="text-sm text-muted-foreground">
                        Renews {new Date(membership.subscription_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {!membership?.promo_active && (
                  <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading}>
                    Manage Subscription
                  </Button>
                )}
              </div>
              {isProActive && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm">
                    <span className="font-medium">GMV this month:</span> £{membership?.monthly_gmv || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{gmvRemaining} remaining for zero buyer fees
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <Card className={currentTier === 'free' && !isProActive ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Free</CardTitle>
                {currentTier === 'free' && !isProActive && (
                  <Badge>Current Plan</Badge>
                )}
              </div>
              <CardDescription className="text-3xl font-light mt-2">
                £0<span className="text-base text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-sm">Standard buyer protection fee (£0.30 + 5%)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-sm">Basic seller features</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-sm">2% instant payout fee</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-sm">Standard support</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className={isProActive ? "border-primary relative overflow-hidden" : "relative overflow-hidden"}>
            {isProActive && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium">
                ACTIVE
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Pro</CardTitle>
                </div>
                <Badge variant="secondary">Popular</Badge>
              </div>
              <CardDescription className="text-3xl font-light mt-2">
                £4.99<span className="text-base text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm font-medium">Zero buyer fees up to £1,000 GMV/month</span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">50% off buyer fees above £1,000</span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">2 free listing boosts per month</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">1% instant payout fee (vs 2%)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">Priority support queue</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">Priority dispute resolution</span>
                </div>
              </div>
              
              {!isProActive && (
                <Button 
                  onClick={handleUpgrade} 
                  className="w-full mt-6" 
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Upgrade to Pro"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-light text-center mb-8">How Pro Membership Works</h2>
          <div className="grid gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Zero Buyer Fees</h3>
                <p className="text-sm text-muted-foreground">
                  Pay zero buyer protection fees on purchases up to £1,000 total value each month. 
                  Once you exceed £1,000, you'll pay 50% off the standard fee (£0.15 + 2.5%) on additional purchases.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Seller Benefits</h3>
                <p className="text-sm text-muted-foreground">
                  Get discounted instant payout fees (1% vs 2%), free listing boosts, and maintain zero seller 
                  commission as long as you stay in Risk Tier A. Pro sellers get priority in dispute resolution.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Flexible Billing</h3>
                <p className="text-sm text-muted-foreground">
                  Monthly subscription at £4.99 with auto-renewal. Cancel anytime through your subscription management. 
                  Benefits apply immediately upon upgrade and reset at the start of each billing cycle.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
    </PageLayout>
  );
};

export default Membership;
