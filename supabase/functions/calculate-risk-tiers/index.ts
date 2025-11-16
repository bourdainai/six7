import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RiskTier = 'A' | 'B' | 'C';

interface SellerMetrics {
  sellerId: string;
  cancellationRate: number;
  avgShippingDays: number;
  disputeRatio: number;
  ratingAverage: number;
  volumeLast30Days: number;
}

function calculateRiskTier(metrics: SellerMetrics): RiskTier {
  let riskScore = 0;

  // Cancellation rate scoring (0-30 points)
  if (metrics.cancellationRate > 0.15) riskScore += 30;
  else if (metrics.cancellationRate > 0.10) riskScore += 20;
  else if (metrics.cancellationRate > 0.05) riskScore += 10;

  // Shipping time scoring (0-25 points)
  if (metrics.avgShippingDays > 7) riskScore += 25;
  else if (metrics.avgShippingDays > 5) riskScore += 15;
  else if (metrics.avgShippingDays > 3) riskScore += 5;

  // Dispute ratio scoring (0-30 points)
  if (metrics.disputeRatio > 0.10) riskScore += 30;
  else if (metrics.disputeRatio > 0.05) riskScore += 20;
  else if (metrics.disputeRatio > 0.02) riskScore += 10;

  // Rating average scoring (0-15 points)
  if (metrics.ratingAverage < 3.5) riskScore += 15;
  else if (metrics.ratingAverage < 4.0) riskScore += 10;
  else if (metrics.ratingAverage < 4.5) riskScore += 5;

  // Volume bonus (reduce risk for high volume good sellers)
  if (metrics.volumeLast30Days > 50 && riskScore < 30) {
    riskScore -= 10;
  } else if (metrics.volumeLast30Days > 20 && riskScore < 30) {
    riskScore -= 5;
  }

  // Ensure score doesn't go negative
  riskScore = Math.max(0, riskScore);

  console.log(`[RISK-CALC] Seller ${metrics.sellerId} - Score: ${riskScore}`);

  // Assign tier based on final score
  if (riskScore >= 50) return 'C';
  if (riskScore >= 25) return 'B';
  return 'A';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[RISK-TIERS] Starting nightly calculation");

    // Get all sellers who have made at least one sale
    const { data: sellers, error: sellersError } = await supabaseClient
      .from("profiles")
      .select("id")
      .not("id", "is", null);

    if (sellersError) throw sellersError;

    let updatedCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const seller of sellers || []) {
      try {
        // Get orders for this seller in last 30 days
        const { data: recentOrders, error: ordersError } = await supabaseClient
          .from("orders")
          .select("id, status, created_at, shipped_at")
          .eq("seller_id", seller.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (ordersError) throw ordersError;

        const totalOrders = recentOrders?.length || 0;
        if (totalOrders === 0) {
          // No recent orders, default to tier A
          await supabaseClient
            .from("seller_risk_ratings")
            .upsert({
              seller_id: seller.id,
              risk_tier: 'A',
              cancellation_rate: 0,
              avg_shipping_days: 0,
              dispute_ratio: 0,
              rating_average: 5.0,
              volume_last_30_days: 0,
              last_calculated_at: new Date().toISOString()
            }, { onConflict: 'seller_id' });
          continue;
        }

        // Calculate cancellation rate
        const cancelledOrders = recentOrders?.filter(o => o.status === 'cancelled').length || 0;
        const cancellationRate = cancelledOrders / totalOrders;

        // Calculate average shipping time
        const shippedOrders = recentOrders?.filter(o => o.shipped_at) || [];
        let avgShippingDays = 0;
        if (shippedOrders.length > 0) {
          const totalDays = shippedOrders.reduce((sum, order) => {
            const created = new Date(order.created_at);
            const shipped = new Date(order.shipped_at!);
            const days = (shipped.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0);
          avgShippingDays = Math.round(totalDays / shippedOrders.length);
        }

        // Calculate dispute ratio
        const { data: disputes } = await supabaseClient
          .from("disputes")
          .select("id")
          .eq("seller_id", seller.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const disputeRatio = (disputes?.length || 0) / totalOrders;

        // Get average rating
        const { data: ratings } = await supabaseClient
          .from("ratings")
          .select("rating")
          .eq("reviewee_id", seller.id)
          .eq("review_type", "seller")
          .gte("created_at", thirtyDaysAgo.toISOString());

        let ratingAverage = 5.0;
        if (ratings && ratings.length > 0) {
          const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
          ratingAverage = sum / ratings.length;
        }

        const metrics: SellerMetrics = {
          sellerId: seller.id,
          cancellationRate,
          avgShippingDays,
          disputeRatio,
          ratingAverage,
          volumeLast30Days: totalOrders
        };

        const riskTier = calculateRiskTier(metrics);

        // Update seller risk rating
        await supabaseClient
          .from("seller_risk_ratings")
          .upsert({
            seller_id: seller.id,
            risk_tier: riskTier,
            cancellation_rate: cancellationRate,
            avg_shipping_days: avgShippingDays,
            dispute_ratio: disputeRatio,
            rating_average: ratingAverage,
            volume_last_30_days: totalOrders,
            last_calculated_at: new Date().toISOString()
          }, { onConflict: 'seller_id' });

        updatedCount++;
        console.log(`[RISK-TIERS] Updated seller ${seller.id} to tier ${riskTier}`);
      } catch (error) {
        console.error(`[RISK-TIERS] Error processing seller ${seller.id}:`, error);
        // Continue with next seller
      }
    }

    console.log(`[RISK-TIERS] Calculation complete. Updated ${updatedCount} sellers.`);

    return new Response(JSON.stringify({ 
      success: true, 
      updated: updatedCount,
      message: `Updated risk tiers for ${updatedCount} sellers`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[RISK-TIERS] ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
