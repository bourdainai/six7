import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Package, DollarSign, ShoppingCart, TrendingUp, Award } from "lucide-react";
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

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast({ title: "Redirecting to Stripe", description: "Complete your onboarding to start receiving payments" });
      }
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-light mb-4">Please sign in</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-light text-foreground">
                Seller Dashboard
              </h1>
              <p className="text-base text-muted-foreground font-light">
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
            {!profile?.stripe_onboarding_complete && (
              <Card className="border-amber-500">
                <CardHeader>
                  <CardTitle>Complete Stripe Onboarding</CardTitle>
                  <CardDescription>Set up payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => onboardMutation.mutate()}>
                    Connect Stripe <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{activeListings}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />Total Sales
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{totalOrders}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">£{totalSales.toFixed(2)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />Avg Order
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">£{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00"}</div></CardContent>
              </Card>
            </div>

            <StaleInventoryAlert />
            <AutomationRulesPanel />
          </TabsContent>

          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle>AI Copilot</CardTitle>
                <CardDescription>Get insights for your listings</CardDescription>
              </CardHeader>
              <CardContent>
                {listings && listings.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {listings.slice(0, 6).map((listing) => (
                      <Card key={listing.id} className="cursor-pointer hover:shadow-lg" onClick={() => setSelectedListingForCopilot(listing.id)}>
                        <CardContent className="p-4">
                          <h3 className="font-medium truncate">{listing.title}</h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No listings yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <AutomationRulesPanel />
          </TabsContent>
        </Tabs>
      </div>

      {selectedListingForCopilot && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 z-10" onClick={() => setSelectedListingForCopilot(null)}>Close</Button>
            <SellerCopilot listingId={selectedListingForCopilot} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
