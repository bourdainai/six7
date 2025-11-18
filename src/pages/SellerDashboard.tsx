import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Package, DollarSign, ShoppingCart, TrendingUp, Award, Wallet, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SellerCopilot } from "@/components/SellerCopilot";
import { StaleInventoryAlert } from "@/components/StaleInventoryAlert";
import { AutomationRulesPanel } from "@/components/AutomationRulesPanel";

const SellerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedListingForCopilot, setSelectedListingForCopilot] = useState<string | null>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["seller-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("seller_id", user!.id).eq("status", "paid");
      if (error) throw error;
      return data;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["seller-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_balances")
        .select("*")
        .eq("seller_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" - that's okay, we'll return default
        throw error;
      }
      return data || { available_balance: 0, pending_balance: 0, currency: "GBP" };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-account-session");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      navigate("/seller/onboarding");
      toast({ title: "Starting Onboarding", description: "Complete your setup to start receiving payments" });
    },
  });

  useEffect(() => {
    if (window.location.search.includes("onboarding=complete")) {
      setTimeout(() => refetchProfile(), 2000);
    }
  }, []);

  const activeListings = listings?.filter((l) => l.status === "active").length || 0;
  const totalSales = sales?.reduce((sum, order) => sum + Number(order.seller_amount), 0) || 0;
  const totalOrders = sales?.length || 0;

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4 tracking-tight">Please sign in</h1>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-light text-foreground tracking-tight">
                Seller Dashboard
              </h1>
              <p className="text-base text-muted-foreground font-normal tracking-tight">
                Manage your listings and track your performance
              </p>
            </div>
            <Button onClick={() => navigate("/seller/reputation")} variant="outline" className="gap-2">
              <Award className="h-4 w-4" />
              View Reputation
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="copilot">AI Copilot</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {!profile?.stripe_connect_account_id ? (
              <Card className="border-amber-500 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Complete Seller Setup
                  </CardTitle>
                  <CardDescription className="font-normal">Set up your payment details to start receiving payments from buyers</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 font-normal">
                    You need to complete Stripe Connect onboarding before you can receive payments. This process takes
                    just a few minutes.
                  </p>
                  <Button onClick={() => onboardMutation.mutate()} disabled={onboardMutation.isPending}>
                    {onboardMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      "Start Onboarding"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : !profile?.stripe_onboarding_complete ? (
              <Card className="border-yellow-500 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    Onboarding In Progress
                  </CardTitle>
                  <CardDescription className="font-normal">
                    Your payment account setup is in progress. Complete verification to start receiving payments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 font-normal">
                    You may need to provide additional information or upload documents to complete verification.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate("/seller/onboarding")} variant="outline">
                      Continue Onboarding
                    </Button>
                    <Button onClick={() => navigate("/seller/account")} variant="outline">
                      Check Verification Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : !profile?.can_receive_payments ? (
              <Card className="border-yellow-500 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    Verification Pending
                  </CardTitle>
                  <CardDescription className="font-normal">
                    Your onboarding is complete, but your account is still being verified by Stripe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 font-normal">
                    This usually takes a few minutes. You'll be able to receive payments once verification is complete.
                  </p>
                  <Button onClick={() => navigate("/seller/account")} variant="outline">
                    Check Verification Status
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Payment Account Active
                  </CardTitle>
                  <CardDescription className="font-normal">Your payment account is set up and ready to receive payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate("/seller/account")} variant="outline">
                    Manage Payment Account
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                    <Package className="h-4 w-4" />Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-light tracking-tight">{activeListings}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                    <ShoppingCart className="h-4 w-4" />Total Sales
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-light tracking-tight">{totalOrders}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                    <DollarSign className="h-4 w-4" />Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-light tracking-tight">£{totalSales.toFixed(2)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                    <TrendingUp className="h-4 w-4" />Avg Order
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-light tracking-tight">£{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00"}</div></CardContent>
              </Card>
            </div>

            {/* Balance Cards */}
            {profile?.stripe_onboarding_complete && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-green-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                      <Wallet className="h-4 w-4 text-green-500" />Available Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-light tracking-tight">
                      {balance?.currency === "GBP" ? "£" : balance?.currency || "£"}
                      {(balance?.available_balance || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-normal">Ready to withdraw</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate("/seller/account")}
                    >
                      View Payouts
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-yellow-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                      <Clock className="h-4 w-4 text-yellow-500" />Pending Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-light tracking-tight">
                      {balance?.currency === "GBP" ? "£" : balance?.currency || "£"}
                      {(balance?.pending_balance || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-normal">Processing</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate("/seller/account")}
                    >
                      View Schedule
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <StaleInventoryAlert />
            <AutomationRulesPanel />
          </TabsContent>

          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle className="font-normal tracking-tight">AI Copilot</CardTitle>
                <CardDescription className="font-normal">Get insights for your listings</CardDescription>
              </CardHeader>
              <CardContent>
                {listings && listings.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {listings.slice(0, 6).map((listing) => (
                      <Card key={listing.id} className="cursor-pointer hover:border-foreground transition-all duration-fast" onClick={() => setSelectedListingForCopilot(listing.id)}>
                        <CardContent className="p-4">
                          <h3 className="font-normal truncate tracking-tight">{listing.title}</h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground font-normal">No listings yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <AutomationRulesPanel />
          </TabsContent>
        </Tabs>

      {selectedListingForCopilot && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-divider-gray bg-background shadow-elevation">
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 z-10" onClick={() => setSelectedListingForCopilot(null)}>Close</Button>
            <SellerCopilot listingId={selectedListingForCopilot} />
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default SellerDashboard;
