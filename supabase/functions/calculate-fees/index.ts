import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const feeCalculationSchema = z.object({
  buyerId: z.string().uuid({ message: 'Invalid buyer ID format' }),
  sellerId: z.string().uuid({ message: 'Invalid seller ID format' }),
  itemPrice: z.number().positive().max(1000000, 'Item price too large'),
  instantPayout: z.boolean().optional().default(false),
  protectionAddon: z.boolean().optional().default(false),
  shippingCost: z.number().min(0).max(1000, 'Shipping cost too large').optional().default(0),
  wholesaleShippingCost: z.number().min(0).max(1000, 'Wholesale shipping cost too large').optional().default(0),
});

interface FeeCalculationRequest {
  buyerId: string;
  sellerId: string;
  itemPrice: number;
  instantPayout?: boolean;
  protectionAddon?: boolean;
  shippingCost?: number;
  wholesaleShippingCost?: number;
}

interface FeeCalculationResponse {
  buyerProtectionFee: number;
  sellerCommissionFee: number;
  sellerCommissionPercentage: number;
  instantPayoutFee: number;
  instantPayoutPercentage: number;
  shippingMargin: number;
  protectionAddonFee: number;
  totalBuyerPays: number;
  totalSellerReceives: number;
  buyerTier: string;
  sellerTier: string;
  sellerRiskTier: string;
  buyerGmvAtPurchase: number;
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
    const body = await req.json();
    const { 
      buyerId, 
      sellerId, 
      itemPrice, 
      instantPayout,
      protectionAddon,
      shippingCost,
      wholesaleShippingCost
    } = feeCalculationSchema.parse(body);

    console.log("[CALCULATE-FEES] Starting calculation", { 
      buyerId, 
      sellerId, 
      itemPrice,
      instantPayout,
      protectionAddon
    });

    // Get buyer membership
    const { data: buyerMembership } = await supabaseClient
      .from("user_memberships")
      .select("*")
      .eq("user_id", buyerId)
      .single();

    // Get seller membership
    const { data: sellerMembership } = await supabaseClient
      .from("user_memberships")
      .select("*")
      .eq("user_id", sellerId)
      .single();

    // Get seller risk rating
    const { data: sellerRisk } = await supabaseClient
      .from("seller_risk_ratings")
      .select("*")
      .eq("seller_id", sellerId)
      .single();

    // Determine effective buyer tier (promo overrides)
    let buyerTier = buyerMembership?.tier || 'free';
    const promoActive = buyerMembership?.promo_user && 
      buyerMembership?.promo_expiry && 
      new Date(buyerMembership.promo_expiry) > new Date();
    
    if (promoActive) {
      buyerTier = 'pro';
    }

    // Determine effective seller tier
    let sellerTier = sellerMembership?.tier || 'free';
    const sellerPromoActive = sellerMembership?.promo_user && 
      sellerMembership?.promo_expiry && 
      new Date(sellerMembership.promo_expiry) > new Date();
    
    if (sellerPromoActive) {
      sellerTier = 'pro';
    }

    const sellerRiskTier = sellerRisk?.risk_tier || 'A';
    const buyerGmv = buyerMembership?.monthly_gmv_counter || 0;

    console.log("[CALCULATE-FEES] User tiers", { 
      buyerTier, 
      sellerTier, 
      sellerRiskTier, 
      buyerGmv 
    });

    // BUYER PROTECTION FEE CALCULATION
    let buyerProtectionFee = 0;
    const standardBuyerFee = 0.30 + (itemPrice * 0.05);

    if (buyerTier === 'free') {
      // Free tier: always pay full fee
      buyerProtectionFee = standardBuyerFee;
    } else if (buyerTier === 'pro') {
      // Pro tier: check GMV cap
      if (buyerGmv < 1000) {
        // Under GMV cap: zero fee
        buyerProtectionFee = 0;
      } else {
        // Over GMV cap: 50% off
        buyerProtectionFee = standardBuyerFee / 2;
      }
    }

    // SELLER COMMISSION CALCULATION
    let sellerCommissionPercentage = 0;
    let sellerCommissionFee = 0;

    // Only Pro sellers in risk tier A pay zero commission
    if (sellerTier === 'pro' && sellerRiskTier === 'A') {
      sellerCommissionPercentage = 0;
      sellerCommissionFee = 0;
    } else {
      // Apply risk-based commission
      switch (sellerRiskTier) {
        case 'A':
          sellerCommissionPercentage = 0;
          break;
        case 'B':
          sellerCommissionPercentage = 3;
          break;
        case 'C':
          sellerCommissionPercentage = 6;
          break;
      }
      sellerCommissionFee = itemPrice * (sellerCommissionPercentage / 100);
    }

    // INSTANT PAYOUT FEE CALCULATION
    let instantPayoutPercentage = 0;
    let instantPayoutFee = 0;

    if (instantPayout) {
      instantPayoutPercentage = sellerTier === 'pro' ? 1 : 2;
      instantPayoutFee = itemPrice * (instantPayoutPercentage / 100);
    }

    // SHIPPING MARGIN
    const shippingMargin = shippingCost > 0 ? shippingCost - wholesaleShippingCost : 0;

    // PROTECTION ADDON
    const protectionAddonFee = protectionAddon ? 1.50 : 0;

    // TOTALS
    const totalBuyerPays = itemPrice + buyerProtectionFee + shippingCost + protectionAddonFee;
    const totalSellerReceives = itemPrice - sellerCommissionFee - instantPayoutFee;

    console.log("[CALCULATE-FEES] Calculation complete", {
      buyerProtectionFee,
      sellerCommissionFee,
      instantPayoutFee,
      totalBuyerPays,
      totalSellerReceives
    });

    const response: FeeCalculationResponse = {
      buyerProtectionFee: Math.round(buyerProtectionFee * 100) / 100,
      sellerCommissionFee: Math.round(sellerCommissionFee * 100) / 100,
      sellerCommissionPercentage,
      instantPayoutFee: Math.round(instantPayoutFee * 100) / 100,
      instantPayoutPercentage,
      shippingMargin: Math.round(shippingMargin * 100) / 100,
      protectionAddonFee,
      totalBuyerPays: Math.round(totalBuyerPays * 100) / 100,
      totalSellerReceives: Math.round(totalSellerReceives * 100) / 100,
      buyerTier,
      sellerTier,
      sellerRiskTier,
      buyerGmvAtPurchase: buyerGmv
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CALCULATE-FEES] ERROR", { message: errorMessage });
    
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request data', details: error.errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
