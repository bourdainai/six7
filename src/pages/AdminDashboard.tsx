import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Star, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Area, AreaChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const AdminDashboard = () => {
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30d");

  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics", analyticsPeriod],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { period: analyticsPeriod },
      });

      if (error) throw error;
      return data;
    },
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-light text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access the admin dashboard.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-light text-foreground">Admin Dashboard</h1>
              <Badge variant="default">Super Admin</Badge>
            </div>
            <p className="text-muted-foreground">Platform management and analytics</p>
          </div>
          <Button onClick={() => navigate("/moderation")}>Moderation Queue</Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">£{analytics?.overview?.totalRevenue?.toFixed(2) || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Platform fees: £{analytics?.overview?.platformFees?.toFixed(2) || 0}
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed: {analytics?.overview?.completedOrders || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">{analytics?.overview?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    New: {analytics?.overview?.newUsers || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light">{analytics?.overview?.activeListings || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {analytics?.overview?.totalListings || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg Order Value</span>
                    </div>
                    <span className="font-medium">£{analytics?.overview?.avgOrderValue?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg Platform Rating</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.avgRating?.toFixed(1) || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Open Disputes</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.openDisputes || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pending Reports</span>
                    </div>
                    <span className="font-medium">{analytics?.overview?.pendingReports || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.orderStatusBreakdown && analytics.orderStatusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics.orderStatusBreakdown}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label
                        >
                          {analytics.orderStatusBreakdown.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
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

          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue and order volume</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.revenueChart && analytics.revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} name="Orders" />
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
                <CardTitle>Top Sellers</CardTitle>
                <CardDescription>Sellers by revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.topSellers && analytics.topSellers.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topSellers.map((seller: any, index: number) => (
                      <div key={seller.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{seller.name}</h4>
                          <p className="text-sm text-muted-foreground">{seller.orders} orders</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{seller.revenue.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No seller data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.userGrowthChart && analytics.userGrowthChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.userGrowthChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No user growth data available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span className="text-lg font-medium">{analytics?.overview?.totalUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">New Users (Period)</span>
                    <span className="text-lg font-medium">{analytics?.overview?.newUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">Avg Rating</span>
                    <span className="text-lg font-medium">{analytics?.overview?.avgRating?.toFixed(1) || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Moderation Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">Open Disputes</span>
                    <span className="text-lg font-medium text-orange-600">{analytics?.overview?.openDisputes || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">Resolved Disputes</span>
                    <span className="text-lg font-medium text-green-600">{analytics?.overview?.resolvedDisputes || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm text-muted-foreground">Pending Reports</span>
                    <span className="text-lg font-medium text-red-600">{analytics?.overview?.pendingReports || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Listings and sales by category</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.categoryBreakdown.map((category: any) => (
                      <div key={category.category} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{category.category}</h4>
                          <Badge variant="secondary">{category.listings} listings</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{category.sales} sales</span>
                          <span className="font-medium">£{category.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
