import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    const { period = "30d" } = await req.json();
    
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

    // Fetch all orders for the seller
    const { data: orders, error: ordersError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        order_items(
          listing_id,
          price
        )
      `)
      .eq("seller_id", user.id)
      .gte("created_at", startDate.toISOString());

    if (ordersError) throw ordersError;

    // Fetch all listings with images
    const { data: listings, error: listingsError } = await supabaseClient
      .from("listings")
      .select(`
        *,
        listing_images(image_url)
      `)
      .eq("seller_id", user.id);

    if (listingsError) throw listingsError;

    // Fetch ratings for the seller
    const { data: ratings, error: ratingsError } = await supabaseClient
      .from("ratings")
      .select("*")
      .eq("reviewee_id", user.id)
      .eq("review_type", "seller");

    if (ratingsError) throw ratingsError;

    // Calculate metrics
    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => o.status === "completed" || o.status === "paid") || [];
    const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.seller_amount), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / completedOrders.length : 0;
    
    const totalViews = listings?.reduce((sum, listing) => sum + (listing.views || 0), 0) || 0;
    const totalSaves = listings?.reduce((sum, listing) => sum + (listing.saves || 0), 0) || 0;
    
    const conversionRate = totalViews > 0 ? (completedOrders.length / totalViews) * 100 : 0;
    
    const avgRating = ratings && ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;

    // Revenue by day
    const revenueByDay = new Map<string, number>();
    completedOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      revenueByDay.set(date, (revenueByDay.get(date) || 0) + Number(order.seller_amount));
    });

    const revenueChart = Array.from(revenueByDay.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top performing listings
    const listingPerformance = listings?.map(listing => {
      const listingOrders = completedOrders.filter(order => 
        order.order_items?.some((item: any) => item.listing_id === listing.id)
      );
      const revenue = listingOrders.reduce((sum, order) => {
        const item = order.order_items?.find((i: any) => i.listing_id === listing.id);
        return sum + (item ? Number(item.price) : 0);
      }, 0);

      return {
        id: listing.id,
        title: listing.title,
        views: listing.views || 0,
        saves: listing.saves || 0,
        sales: listingOrders.length,
        revenue,
        image: listing.listing_images?.[0]?.image_url,
        conversionRate: listing.views > 0 ? (listingOrders.length / listing.views) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

    // Category breakdown
    const categoryStats = new Map<string, { sales: number; revenue: number }>();
    listings?.forEach(listing => {
      const category = listing.category || "Uncategorized";
      const listingOrders = completedOrders.filter(order => 
        order.order_items?.some((item: any) => item.listing_id === listing.id)
      );
      const revenue = listingOrders.reduce((sum, order) => {
        const item = order.order_items?.find((i: any) => i.listing_id === listing.id);
        return sum + (item ? Number(item.price) : 0);
      }, 0);

      const current = categoryStats.get(category) || { sales: 0, revenue: 0 };
      categoryStats.set(category, {
        sales: current.sales + listingOrders.length,
        revenue: current.revenue + revenue,
      });
    });

    const categoryBreakdown = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      sales: stats.sales,
      revenue: stats.revenue,
    }));

    return new Response(
      JSON.stringify({
        overview: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          totalViews,
          totalSaves,
          conversionRate,
          avgRating,
          activeListings: listings?.filter(l => l.status === "active").length || 0,
        },
        revenueChart,
        listingPerformance,
        categoryBreakdown,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seller analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
