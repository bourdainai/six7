import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Currency-specific fee configuration
// Based on plan: 40p/50c base + 1% over £20/$25
const FEE_CONFIG: Record<string, { baseFee: number; percentThreshold: number; percentRate: number }> = {
  GBP: { baseFee: 0.40, percentThreshold: 20, percentRate: 0.01 },
  USD: { baseFee: 0.50, percentThreshold: 25, percentRate: 0.01 },
  EUR: { baseFee: 0.45, percentThreshold: 22, percentRate: 0.01 },
};

// Stripe processing costs (our costs, for reference)
const STRIPE_COSTS: Record<string, { percent: number; fixed: number }> = {
  GBP: { percent: 0.015, fixed: 0.20 }, // 1.5% + 20p for UK cards
  USD: { percent: 0.029, fixed: 0.30 }, // 2.9% + 30c for US cards
  EUR: { percent: 0.025, fixed: 0.20 }, // 2.5% + 20p for EU cards
};

const feeCalculationSchema = z.object({
  buyerId: z.string().uuid({ message: 'Invalid buyer ID format' }).optional(),
  sellerId: z.string().uuid({ message: 'Invalid seller ID format' }).optional(),
  itemPrice: z.number().positive().max(1000000, 'Item price too large'),
  currency: z.string().length(3).default('GBP'),
  instantPayout: z.boolean().optional().default(false),
  protectionAddon: z.boolean().optional().default(false),
  shippingCost: z.number().min(0).max(1000, 'Shipping cost too large').optional().default(0),
  wholesaleShippingCost: z.number().min(0).max(1000, 'Wholesale shipping cost too large').optional().default(0),
  // For simple fee preview (no user context needed)
  previewOnly: z.boolean().optional().default(false),
});

interface FeeCalculationResponse {
  // New tiered fees
  buyerTransactionFee: number;
  sellerTransactionFee: number;
  buyerFeeBreakdown: {
    baseFee: number;
    percentageFee: number;
    total: number;
  };
  sellerFeeBreakdown: {
    baseFee: number;
    percentageFee: number;
    total: number;
  };
  // Platform revenue
  platformRevenue: number;
  stripeProcessingCost: number;
  netPlatformRevenue: number;
  // Legacy fields for compatibility
  buyerProtectionFee: number;
  sellerCommissionFee: number;
  sellerCommissionPercentage: number;
  instantPayoutFee: number;
  instantPayoutPercentage: number;
  shippingMargin: number;
  protectionAddonFee: number;
  // Totals
  totalBuyerPays: number;
  totalSellerReceives: number;
  itemPrice: number;
  currency: string;
  // User tier info (if available)
  buyerTier: string;
  sellerTier: string;
  sellerRiskTier: string;
  buyerGmvAtPurchase: number;
}

/**
 * Calculate the tiered transaction fee
 * - Base fee (40p/50c) for all items
 * - Plus 1% on amount over threshold (£20/$25)
 */
function calculateTieredFee(itemPrice: number, currency: string): { baseFee: number; percentageFee: number; total: number } {
  const config = FEE_CONFIG[currency] || FEE_CONFIG.GBP;
  
  const baseFee = config.baseFee;
  let percentageFee = 0;
  
  if (itemPrice > config.percentThreshold) {
    const amountOverThreshold = itemPrice - config.percentThreshold;
    percentageFee = amountOverThreshold * config.percentRate;
  }
  
  const total = baseFee + percentageFee;
  
  return {
    baseFee: Math.round(baseFee * 100) / 100,
    percentageFee: Math.round(percentageFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Estimate Stripe processing cost
 */
function estimateStripeCost(totalAmount: number, currency: string): number {
  const costs = STRIPE_COSTS[currency] || STRIPE_COSTS.GBP;
  return costs.fixed + (totalAmount * costs.percent);
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
      currency,
      instantPayout,
      protectionAddon,
      shippingCost,
      wholesaleShippingCost,
      previewOnly
    } = feeCalculationSchema.parse(body);

    const currencyUpper = currency.toUpperCase();

    console.log("[CALCULATE-FEES] Starting calculation", { 
      buyerId, 
      sellerId, 
      itemPrice,
      currency: currencyUpper,
      instantPayout,
      protectionAddon,
      previewOnly
    });

    // Calculate new tiered fees (same for buyer and seller)
    const buyerFeeBreakdown = calculateTieredFee(itemPrice, currencyUpper);
    const sellerFeeBreakdown = calculateTieredFee(itemPrice, currencyUpper);
    
    const buyerTransactionFee = buyerFeeBreakdown.total;
    const sellerTransactionFee = sellerFeeBreakdown.total;

    // Default tier values
    let buyerTier = 'free';
    let sellerTier = 'free';
    let sellerRiskTier = 'A';
    let buyerGmv = 0;

    // If not preview only, fetch user data for potential tier-based adjustments
    if (!previewOnly && buyerId) {
      // Get buyer membership
      const { data: buyerMembership } = await supabaseClient
        .from("user_memberships")
        .select("*")
        .eq("user_id", buyerId)
        .single();

      // Determine effective buyer tier (promo overrides)
      buyerTier = buyerMembership?.tier || 'free';
      const promoActive = buyerMembership?.promo_user && 
        buyerMembership?.promo_expiry && 
        new Date(buyerMembership.promo_expiry) > new Date();
      
      if (promoActive) {
        buyerTier = 'pro';
      }
      buyerGmv = buyerMembership?.monthly_gmv_counter || 0;
    }

    if (!previewOnly && sellerId) {
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

      // Determine effective seller tier
      sellerTier = sellerMembership?.tier || 'free';
      const sellerPromoActive = sellerMembership?.promo_user && 
        sellerMembership?.promo_expiry && 
        new Date(sellerMembership.promo_expiry) > new Date();
      
      if (sellerPromoActive) {
        sellerTier = 'pro';
      }
      sellerRiskTier = sellerRisk?.risk_tier || 'A';
    }

    console.log("[CALCULATE-FEES] User tiers", { 
      buyerTier, 
      sellerTier, 
      sellerRiskTier, 
      buyerGmv 
    });

    // INSTANT PAYOUT FEE CALCULATION (if requested)
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
    // Buyer pays: item price + buyer transaction fee + shipping + protection addon
    const totalBuyerPays = itemPrice + buyerTransactionFee + shippingCost + protectionAddonFee;
    
    // Seller receives: item price - seller transaction fee - instant payout fee
    const totalSellerReceives = itemPrice - sellerTransactionFee - instantPayoutFee;

    // Platform revenue calculation
    const platformRevenue = buyerTransactionFee + sellerTransactionFee + shippingMargin;
    const stripeProcessingCost = estimateStripeCost(totalBuyerPays, currencyUpper);
    const netPlatformRevenue = platformRevenue - stripeProcessingCost;

    console.log("[CALCULATE-FEES] Calculation complete", {
      buyerTransactionFee,
      sellerTransactionFee,
      platformRevenue,
      stripeProcessingCost,
      netPlatformRevenue,
      totalBuyerPays,
      totalSellerReceives
    });

    const response: FeeCalculationResponse = {
      // New tiered fees
      buyerTransactionFee: Math.round(buyerTransactionFee * 100) / 100,
      sellerTransactionFee: Math.round(sellerTransactionFee * 100) / 100,
      buyerFeeBreakdown,
      sellerFeeBreakdown,
      // Platform revenue
      platformRevenue: Math.round(platformRevenue * 100) / 100,
      stripeProcessingCost: Math.round(stripeProcessingCost * 100) / 100,
      netPlatformRevenue: Math.round(netPlatformRevenue * 100) / 100,
      // Legacy fields (mapped to new fees for compatibility)
      buyerProtectionFee: Math.round(buyerTransactionFee * 100) / 100,
      sellerCommissionFee: Math.round(sellerTransactionFee * 100) / 100,
      sellerCommissionPercentage: sellerFeeBreakdown.percentageFee > 0 ? 1 : 0,
      instantPayoutFee: Math.round(instantPayoutFee * 100) / 100,
      instantPayoutPercentage,
      shippingMargin: Math.round(shippingMargin * 100) / 100,
      protectionAddonFee,
      // Totals
      totalBuyerPays: Math.round(totalBuyerPays * 100) / 100,
      totalSellerReceives: Math.round(totalSellerReceives * 100) / 100,
      itemPrice: Math.round(itemPrice * 100) / 100,
      currency: currencyUpper,
      // User tier info
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
