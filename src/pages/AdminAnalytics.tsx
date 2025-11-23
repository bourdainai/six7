import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Package,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type {
  AdminAnalyticsResponse,
  AdminOverview,
  CategoryBreakdownEntry,
  OrderStatusEntry,
  RevenueChartPoint,
  TopSeller,
  UserGrowthPoint,
} from "@/types/analytics";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export default function AdminAnalytics() {
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [charts, setCharts] = useState<{
      revenue: RevenueChartPoint[];
      users: UserGrowthPoint[];
      categories: CategoryBreakdownEntry[];
      orderStatus: OrderStatusEntry[];
      topSellers: TopSeller[];
    }>({
      revenue: [],
      users: [],
      categories: [],
      orderStatus: [],
      topSellers: [],
    });

  useEffect(() => {
    fetchAnalytics();
  }, []);

    const fetchAnalytics = async () => {
    try {
        const { data, error } = await supabase.functions.invoke<AdminAnalyticsResponse>("admin-analytics");
      
      if (error) throw error;
      
        setOverview(data.overview);
        setCharts({
          revenue: data.revenueChart,
          users: data.userGrowthChart,
          categories: data.categoryBreakdown,
          orderStatus: data.orderStatusBreakdown,
          topSellers: data.topSellers,
        });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  if (!overview) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-light text-foreground">Analytics</h1>
          </div>
          <p className="text-base text-muted-foreground font-light">
            Platform metrics and performance insights
          </p>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold">{overview?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground font-light mt-1">
                +{overview?.newUsers || 0} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">GMV (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
                £{(overview?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground font-light mt-1">
                  Avg order value £{overview?.avgOrderValue?.toFixed(2) || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold">{overview?.activeListings || 0}</div>
            <p className="text-xs text-muted-foreground font-light mt-1">
                {overview?.completedOrders || 0} sold this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Fraud Flags</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
                {overview?.pendingReports || 0}
            </div>
            <p className="text-xs text-muted-foreground font-light mt-1">
                  {overview?.openDisputes || 0} disputes open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-light">Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-light">User Growth (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.users}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="newUsers" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-light">Listings by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                      data={charts.categories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                      {charts.categories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Moderation Queue</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">{overview?.pendingReports || 0}</div>
                  <p className="text-xs text-muted-foreground">Reports pending review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">{overview?.openDisputes || 0}</div>
                <p className="text-xs text-muted-foreground">Open cases</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reports (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">{overview?.resolvedDisputes || 0}</div>
                  <p className="text-xs text-muted-foreground">Resolved disputes</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
}
