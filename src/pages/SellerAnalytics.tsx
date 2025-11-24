import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2, TrendingUp, Package, Eye, Heart, MessageSquare, DollarSign, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const SellerAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin } = useAdminCheck();

  // Fetch seller analytics data for last 30 days
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["seller-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from("seller_analytics")
        .select("*")
        .eq("seller_id", user.id)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch top-selling items
  const { data: topItems } = useQuery({
    queryKey: ["top-selling-items", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items(
            listing:listings(id, title, seller_price, images:listing_images(image_url))
          )
        `)
        .eq("seller_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate summary metrics
  const summaryMetrics = analytics?.reduce((acc, day) => ({
    revenue: acc.revenue + Number(day.total_revenue),
    sales: acc.sales + day.total_sales,
    views: acc.views + day.total_views,
    saves: acc.saves + day.total_saves,
    messages: acc.messages + day.total_messages,
  }), { revenue: 0, sales: 0, views: 0, saves: 0, messages: 0 });

  const avgConversionRate = analytics?.length 
    ? analytics.reduce((acc, day) => acc + Number(day.conversion_rate), 0) / analytics.length
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-[72px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-[72px]">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-base text-muted-foreground font-light">
            Last 30 days performance overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{summaryMetrics?.revenue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {summaryMetrics?.sales || 0} sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics?.views || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all listings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgConversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Views to sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saves</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics?.saves || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items favorited
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics?.messages || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Buyer inquiries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sale Price</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{summaryMetrics?.sales ? (summaryMetrics.revenue / summaryMetrics.sales).toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per item sold
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
            <TabsTrigger value="top-items">Top Items</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
                <CardDescription>Revenue and activity by day</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && analytics.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.map((day) => (
                      <div key={day.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">
                            {day.total_sales} sales • {day.total_views} views • {day.total_saves} saves
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">£{Number(day.total_revenue).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {Number(day.conversion_rate).toFixed(1)}% conversion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No analytics data yet. Data will populate as you make sales.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>Your most recent completed orders</CardDescription>
              </CardHeader>
              <CardContent>
                {topItems && topItems.length > 0 ? (
                  <div className="space-y-3">
                    {topItems.map((order) => (
                      <div key={order.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        {order.items?.[0]?.listing?.images?.[0] && (
                          <img
                            src={order.items[0].listing.images[0].image_url}
                            alt={order.items[0].listing.title}
                            className="w-16 h-16 object-cover rounded"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{order.items?.[0]?.listing?.title || 'Item'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">£{Number(order.total_amount).toFixed(2)}</p>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No completed sales yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SellerAnalytics;
