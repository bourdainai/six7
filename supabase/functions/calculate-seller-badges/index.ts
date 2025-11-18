import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sellerId } = await req.json();

    if (!sellerId) {
      return new Response(
        JSON.stringify({ error: "Missing sellerId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get seller stats
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id, trust_score, created_at, email_verified, phone_verified, id_verified, business_verified")
      .eq("id", sellerId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Seller not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order stats
    const { data: orders } = await supabaseClient
      .from("orders")
      .select("id, status, created_at")
      .eq("seller_id", sellerId);

    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => o.status === "delivered").length || 0;

    // Get rating stats
    const { data: ratings } = await supabaseClient
      .from("ratings")
      .select("rating")
      .eq("seller_id", sellerId);

    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
      : 0;

    // Get shipping stats
    const { data: shippingData } = await supabaseClient
      .from("orders")
      .select("created_at, shipping_details(shipped_at, delivered_at)")
      .eq("seller_id", sellerId)
      .eq("status", "delivered");

    const shippingTimes = shippingData
      ?.map(order => {
        const shipped = order.shipping_details?.[0]?.shipped_at;
        const created = order.created_at;
        if (shipped && created) {
          return (new Date(shipped).getTime() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
        }
        return null;
      })
      .filter((time): time is number => time !== null) || [];

    const avgShippingDays = shippingTimes.length > 0
      ? shippingTimes.reduce((sum, time) => sum + time, 0) / shippingTimes.length
      : null;

    // Calculate badges to assign
    const badgesToAssign: Array<{ type: string; name: string; description: string }> = [];

    // Verified Seller - if has verifications
    if (profile.email_verified || profile.phone_verified || profile.id_verified) {
      badgesToAssign.push({
        type: "verified_seller",
        name: "Verified Seller",
        description: "Identity verified",
      });
    }

    // New Seller - if joined less than 30 days ago
    const daysSinceJoin = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin < 30) {
      badgesToAssign.push({
        type: "new_seller",
        name: "New Seller",
        description: "Recently joined the marketplace",
      });
    }

    // Fast Shipper - if average shipping < 2 days
    if (avgShippingDays !== null && avgShippingDays < 2) {
      badgesToAssign.push({
        type: "fast_shipper",
        name: "Fast Shipper",
        description: `Average shipping time: ${avgShippingDays.toFixed(1)} days`,
      });
    }

    // Excellent Rating - if 4.5+ stars with 5+ ratings
    if (avgRating >= 4.5 && (ratings?.length || 0) >= 5) {
      badgesToAssign.push({
        type: "excellent_rating",
        name: "Excellent Rating",
        description: `${avgRating.toFixed(1)} star average`,
      });
    }

    // Top Seller - if 50+ completed orders
    if (completedOrders >= 50) {
      badgesToAssign.push({
        type: "top_seller",
        name: "Top Seller",
        description: `${completedOrders} completed orders`,
      });
    }

    // Trusted Seller - if trust score >= 75
    if (profile.trust_score >= 75) {
      badgesToAssign.push({
        type: "trusted_seller",
        name: "Trusted Seller",
        description: `Trust score: ${profile.trust_score}`,
      });
    }

    // Power Seller - if top 10% by volume (would need comparison with all sellers)
    // For now, use 100+ orders as threshold
    if (completedOrders >= 100) {
      badgesToAssign.push({
        type: "power_seller",
        name: "Power Seller",
        description: `${completedOrders} completed orders`,
      });
    }

    // Verified Business
    if (profile.business_verified) {
      badgesToAssign.push({
        type: "verified_business",
        name: "Verified Business",
        description: "Business registration verified",
      });
    }

    // Assign badges
    const assignedBadges = [];
    for (const badge of badgesToAssign) {
      // Check if badge already exists
      const { data: existing } = await supabaseClient
        .from("seller_badges")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("badge_type", badge.type)
        .single();

      if (existing) {
        // Update existing
        const { data } = await supabaseClient
          .from("seller_badges")
          .update({
            badge_name: badge.name,
            description: badge.description,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (data) assignedBadges.push(data);
      } else {
        // Create new
        const { data } = await supabaseClient
          .from("seller_badges")
          .insert({
            seller_id: sellerId,
            badge_type: badge.type,
            badge_name: badge.name,
            description: badge.description,
            is_active: true,
          })
          .select()
          .single();
        if (data) assignedBadges.push(data);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        badges: assignedBadges,
        stats: {
          totalOrders,
          completedOrders,
          avgRating,
          avgShippingDays,
          trustScore: profile.trust_score,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calculate-seller-badges:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
