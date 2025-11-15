import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ExternalLink, TrendingUp, Package, DollarSign, Eye, Heart, ShoppingCart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SellerCopilot } from "@/components/SellerCopilot";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SellerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedListingForCopilot, setSelectedListingForCopilot] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30d");

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

  const { data: analytics } = useQuery({
    queryKey: ["seller-analytics", user?.id, analyticsPeriod],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("seller-analytics", {
        body: { period: analyticsPeriod },
      });

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

  const checkOnboardingStatus = async () => {
    if (window.location.search.includes("onboarding=complete")) {
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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

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
          <p className="text-muted-foreground">Analytics and performance insights</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {!profile?.stripe_onboarding_complete && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Setup Required</CardTitle>
                  <CardDescription>Complete your Stripe account setup to start receiving payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => onboardMutation.mutate()}
                    disabled={onboardMutation.isPending}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {onboardMutation.isPending ? "Setting up..." : "Complete Setup with Stripe"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">{analytics?.overview?.activeListings || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Total Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">{analytics?.overview?.totalOrders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">£{analytics?.overview?.totalRevenue?.toFixed(2) || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Avg Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">{analytics?.overview?.avgRating?.toFixed(1) || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Views</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.totalViews || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Saves</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.totalSaves || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.conversionRate?.toFixed(2) || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg Order Value</span>
                    </div>
                    <span className="font-medium">£{analytics?.overview?.avgOrderValue?.toFixed(2) || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics.categoryBreakdown}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label
                        >
                          {analytics.categoryBreakdown.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-end mb-4">
              <select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                className="px-4 py-2 border border-border rounded-md bg-background"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.revenueChart && analytics.revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Listings</CardTitle>
                <CardDescription>Your best-selling items</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.listingPerformance && analytics.listingPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.listingPerformance.map((listing: any) => (
                      <div
                        key={listing.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        {listing.image ? (
                          <img
                            src={listing.image}
                            alt={listing.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{listing.title}</h4>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {listing.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {listing.saves}
                            </span>
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              {listing.sales}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{listing.revenue.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {listing.conversionRate.toFixed(1)}% conv.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No listing performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Listings</CardTitle>
                    <CardDescription className="mt-2">Manage your active listings</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/sell")}>Create Listing</Button>
                </div>
              </CardHeader>
              <CardContent>
                {listings && listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.map((listing) => (
                      <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/listing/${listing.id}`)}>
                        <div className="aspect-square bg-muted" />
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium truncate flex-1">{listing.title}</h3>
                            <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                              {listing.status}
                            </Badge>
                          </div>
                          <p className="text-lg font-light mb-2">£{Number(listing.seller_price).toFixed(2)}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {listing.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {listing.saves || 0}
                            </span>
                          </div>
                          {listing.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedListingForCopilot(listing.id);
                              }}
                            >
                              Get AI Insights
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No listings yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first listing to start selling</p>
                    <Button onClick={() => navigate("/sell")}>Create Listing</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedListingForCopilot && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => setSelectedListingForCopilot(null)}
            >
              Close
            </Button>
            <SellerCopilot listingId={selectedListingForCopilot} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
