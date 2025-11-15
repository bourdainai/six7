import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Package, MessageSquare, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [usersRes, listingsRes, ordersRes, messagesRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount"),
        supabase.from("messages").select("*", { count: "exact", head: true }),
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalListings: listingsRes.count || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalMessages: messagesRes.count || 0,
        totalRevenue,
      };
    },
  });

  const { data: recentListings } = useQuery({
    queryKey: ["admin-recent-listings"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, seller_price, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

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
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{stats?.totalListings || 0}</div>
              <p className="text-xs text-muted-foreground">Active inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">Completed transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">£{stats?.totalRevenue.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">Gross marketplace volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Listings</CardTitle>
              <CardDescription>Latest items added to the marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentListings?.map((listing) => (
                  <div key={listing.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{listing.seller_price}</p>
                      <Badge variant={listing.status === "active" ? "default" : "secondary"} className="text-xs">
                        {listing.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentListings || recentListings.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent listings</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest transactions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders?.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{Number(order.total_amount).toFixed(2)}</p>
                      <Badge variant="default" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent orders</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Exclusive super admin tools and features</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Package className="w-4 h-4 mr-2" />
              Review Listings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              View Reports
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              Payouts
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Fraud Detection
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
