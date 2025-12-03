import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
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
      logger.error("Error fetching analytics:", error);
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
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Platform metrics and performance insights
              </p>
            </div>
          </div>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold tracking-tight">{overview?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
                +{overview?.newUsers || 0} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">GMV (30d)</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
                £{(overview?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                  Avg order £{overview?.avgOrderValue?.toFixed(2) || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold tracking-tight">{overview?.activeListings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
                {overview?.completedOrders || 0} sold this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fraud Flags</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-600">
                {overview?.pendingReports || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                  {overview?.openDisputes || 0} disputes open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] pt-4">
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

        <TabsContent value="users" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">User Growth (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] pt-4">
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

        <TabsContent value="categories" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Listings by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] pt-4">
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

        <TabsContent value="moderation" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Moderation Queue</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{overview?.pendingReports || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Reports pending review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{overview?.openDisputes || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Open cases</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resolved (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{overview?.resolvedDisputes || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
}
