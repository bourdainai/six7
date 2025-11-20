import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const analyticsSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      throw new Error("Unauthorized: Admin access required");
    }

    const body = await req.json().catch(() => ({}));
    const { period } = analyticsSchema.parse(body);
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch all orders
    const { data: orders, error: ordersError } = await supabaseClient
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString());

    if (ordersError) throw ordersError;

    // Fetch all users (profiles)
    const { data: allUsers } = await supabaseClient
      .from("profiles")
      .select("id, created_at");

    const newUsers = allUsers?.filter(u => 
      new Date(u.created_at) >= startDate
    ) || [];

    // Fetch all listings
    const { data: listings } = await supabaseClient
      .from("listings")
      .select("*");

    // Fetch disputes
    const { data: disputes } = await supabaseClient
      .from("disputes")
      .select("*")
      .gte("created_at", startDate.toISOString());

    // Fetch reports
    const { data: reports } = await supabaseClient
      .from("reports")
      .select("*")
      .gte("created_at", startDate.toISOString());

    // Fetch ratings
    const { data: ratings } = await supabaseClient
      .from("ratings")
      .select("*")
      .gte("created_at", startDate.toISOString());

    // Calculate platform metrics
    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => o.status === "completed" || o.status === "paid") || [];
    const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const platformFees = completedOrders.reduce((sum, order) => sum + Number(order.platform_fee), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const totalUsers = allUsers?.length || 0;
    const activeListings = listings?.filter(l => l.status === "active").length || 0;
    const totalListings = listings?.length || 0;

    const openDisputes = disputes?.filter(d => d.status === "open").length || 0;
    const resolvedDisputes = disputes?.filter(d => d.status === "resolved").length || 0;

    const pendingReports = reports?.filter(r => r.status === "pending").length || 0;

    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Revenue by day
    const revenueByDay = new Map<string, number>();
    const ordersByDay = new Map<string, number>();
    completedOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      revenueByDay.set(date, (revenueByDay.get(date) || 0) + Number(order.total_amount));
      ordersByDay.set(date, (ordersByDay.get(date) || 0) + 1);
    });

    const revenueChart = Array.from(revenueByDay.entries())
      .map(([date, revenue]) => ({ 
        date, 
        revenue,
        orders: ordersByDay.get(date) || 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // User growth by day
    const usersByDay = new Map<string, number>();
    newUsers.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      usersByDay.set(date, (usersByDay.get(date) || 0) + 1);
    });

    const userGrowthChart = Array.from(usersByDay.entries())
      .map(([date, users]) => ({ date, users }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top sellers by revenue
    const sellerRevenue = new Map<string, { revenue: number; orders: number; name: string }>();
    for (const order of completedOrders) {
      const current = sellerRevenue.get(order.seller_id) || { revenue: 0, orders: 0, name: "" };
      sellerRevenue.set(order.seller_id, {
        revenue: current.revenue + Number(order.seller_amount),
        orders: current.orders + 1,
        name: current.name,
      });
    }

    // Fetch seller names
    const sellerIds = Array.from(sellerRevenue.keys());
    const { data: sellers } = await supabaseClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", sellerIds);

    sellers?.forEach(seller => {
      const current = sellerRevenue.get(seller.id);
      if (current) {
        current.name = seller.full_name || seller.email || "Unknown";
      }
    });

    const topSellers = Array.from(sellerRevenue.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        revenue: data.revenue,
        orders: data.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Category breakdown
    const categoryStats = new Map<string, { listings: number; sales: number; revenue: number }>();
    listings?.forEach(listing => {
      const category = listing.category || "Uncategorized";
      const listingOrders = completedOrders.filter(order =>
        order.order_items?.some((item: any) => item.listing_id === listing.id)
      );
      const revenue = listingOrders.reduce((sum, order) => {
        const item = order.order_items?.find((i: any) => i.listing_id === listing.id);
        return sum + (item ? Number(item.price) : 0);
      }, 0);

      const current = categoryStats.get(category) || { listings: 0, sales: 0, revenue: 0 };
      categoryStats.set(category, {
        listings: current.listings + 1,
        sales: current.sales + listingOrders.length,
        revenue: current.revenue + revenue,
      });
    });

    const categoryBreakdown = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        listings: stats.listings,
        sales: stats.sales,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Order status breakdown
    const orderStatusStats = new Map<string, number>();
    orders?.forEach(order => {
      orderStatusStats.set(order.status, (orderStatusStats.get(order.status) || 0) + 1);
    });

    const orderStatusBreakdown = Array.from(orderStatusStats.entries())
      .map(([status, count]) => ({ status, count }));

    return new Response(
      JSON.stringify({
        overview: {
          totalRevenue,
          platformFees,
          totalOrders,
          completedOrders: completedOrders.length,
          avgOrderValue,
          totalUsers,
          newUsers: newUsers.length,
          activeListings,
          totalListings,
          openDisputes,
          resolvedDisputes,
          pendingReports,
          avgRating,
        },
        revenueChart,
        userGrowthChart,
        topSellers,
        categoryBreakdown,
        orderStatusBreakdown,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin analytics error:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
