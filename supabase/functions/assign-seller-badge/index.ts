import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { requireAdmin, handleCORS, createErrorResponse } from "../_shared/admin-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BadgeAssignmentRequest {
  sellerId: string;
  badgeType: string;
  badgeName: string;
  description?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

const badgeDefinitions: Record<string, { name: string; description: string }> = {
  verified_seller: {
    name: "Verified Seller",
    description: "Seller has completed identity verification",
  },
  top_seller: {
    name: "Top Seller",
    description: "Consistently high ratings and sales volume",
  },
  fast_shipper: {
    name: "Fast Shipper",
    description: "Average shipping time under 2 days",
  },
  excellent_rating: {
    name: "Excellent Rating",
    description: "Maintains 4.5+ star average rating",
  },
  trusted_seller: {
    name: "Trusted Seller",
    description: "High trust score and verified credentials",
  },
  new_seller: {
    name: "New Seller",
    description: "Recently joined the marketplace",
  },
  power_seller: {
    name: "Power Seller",
    description: "Top 10% of sellers by sales volume",
  },
  verified_business: {
    name: "Verified Business",
    description: "Business registration verified",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCORS();
  }

  try {
    await requireAdmin(req);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sellerId, badgeType, badgeName, description, expiresAt, metadata }: BadgeAssignmentRequest = await req.json();

    if (!sellerId || !badgeType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sellerId, badgeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use badge definition if available
    const badgeDef = badgeDefinitions[badgeType];
    const finalBadgeName = badgeName || badgeDef?.name || badgeType;
    const finalDescription = description || badgeDef?.description || "";

    // Check if badge already exists
    const { data: existing } = await supabaseClient
      .from("seller_badges")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("badge_type", badgeType)
      .single();

    if (existing) {
      // Update existing badge
      const { data, error } = await supabaseClient
        .from("seller_badges")
        .update({
          badge_name: finalBadgeName,
          description: finalDescription,
          expires_at: expiresAt || null,
          is_active: true,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, badge: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new badge
    const { data, error } = await supabaseClient
      .from("seller_badges")
      .insert({
        seller_id: sellerId,
        badge_type: badgeType,
        badge_name: finalBadgeName,
        description: finalDescription,
        expires_at: expiresAt || null,
        is_active: true,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, badge: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in assign-seller-badge:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
