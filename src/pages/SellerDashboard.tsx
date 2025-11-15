import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ExternalLink, TrendingUp, Package, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SellerCopilot } from "@/components/SellerCopilot";

const SellerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedListingForCopilot, setSelectedListingForCopilot] = useState<string | null>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["seller-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user!.id)
        .eq("status", "paid");

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
        toast({
          title: "Redirecting to Stripe",
          description: "Complete your onboarding to start receiving payments",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if onboarding is complete on mount
  const checkOnboardingStatus = async () => {
    if (window.location.search.includes("onboarding=complete")) {
      // Wait a moment for Stripe webhook to process
      setTimeout(() => {
        refetchProfile();
      }, 2000);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const activeListings = listings?.filter((l) => l.status === "active").length || 0;
  const totalSales = sales?.reduce((sum, order) => sum + Number(order.seller_amount), 0) || 0;
  const totalOrders = sales?.length || 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl font-light text-foreground mb-4">Please sign in</h1>
          <p className="text-muted-foreground">You need to be signed in to access the seller dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and track your sales</p>
        </div>

        {/* Onboarding Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {profile?.stripe_onboarding_complete ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Payment Setup Complete
                </>
              ) : (
                "Payment Setup Required"
              )}
            </CardTitle>
            <CardDescription>
              {profile?.stripe_onboarding_complete
                ? "You're ready to receive payments from buyers"
                : "Complete your Stripe account setup to start receiving payments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.stripe_onboarding_complete ? (
              <div className="flex items-center gap-4">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  Active
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Payments will be transferred to your account after each sale
                </p>
              </div>
            ) : (
              <Button
                onClick={() => onboardMutation.mutate()}
                disabled={onboardMutation.isPending}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {onboardMutation.isPending ? "Setting up..." : "Complete Setup with Stripe"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{activeListings}</div>
              <p className="text-xs text-muted-foreground">
                {listings?.length || 0} total listings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">£{totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {totalOrders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">
                {listings && listings.length > 0
                  ? ((totalOrders / listings.length) * 100).toFixed(1)
                  : "0"}%
              </div>
              <p className="text-xs text-muted-foreground">
                Orders per listing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Copilot Section */}
        {selectedListingForCopilot && (
          <div className="mb-8">
            <SellerCopilot listingId={selectedListingForCopilot} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your selling activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/sell-enhanced")}
              >
                Create New Listing
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/orders")}
              >
                View Orders
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest sales and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {sales && sales.length > 0 ? (
                <div className="space-y-3">
                  {sales.slice(0, 3).map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Order #{sale.id.slice(0, 8)}
                      </span>
                      <span className="font-medium">£{Number(sale.seller_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sales yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Listings Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
            <CardDescription>Manage and optimize your active listings</CardDescription>
          </CardHeader>
          <CardContent>
            {!listings || listings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No listings yet</p>
                <Button onClick={() => navigate("/sell-enhanced")}>Create Your First Listing</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing: any) => (
                  <div key={listing.id} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{listing.title}</h3>
                          <p className="text-sm text-muted-foreground">{listing.category}</p>
                        </div>
                        <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                          {listing.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">${listing.seller_price}</span>
                        <span>Views: {listing.views || 0}</span>
                        <span>Saves: {listing.saves || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedListingForCopilot(
                          selectedListingForCopilot === listing.id ? null : listing.id
                        )}
                      >
                        {selectedListingForCopilot === listing.id ? "Hide AI" : "AI Optimize"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;