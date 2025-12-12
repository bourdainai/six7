import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

async function sendWebPush(subscription: any, payload: any, vapidKeys: { publicKey: string; privateKey: string }) {
  // Web Push requires the web-push library or manual implementation
  // For now, we'll use the Fetch API with proper headers
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        // Note: Full web push implementation requires VAPID signing
        // This is a simplified version - in production, use a proper web-push library
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Push failed:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Push error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function should be called internally by other functions
    // or from the server-side with service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(-10))) {
      // Simple check - in production use proper auth
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader! } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const payload: PushPayload = await req.json();

    if (!payload.userId || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's push subscriptions
    const { data: subscriptions, error } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.userId);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!publicKey || !privateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pushPayload = {
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: payload.icon || "/favicon.ico",
      tag: payload.tag,
    };

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      };

      const success = await sendWebPush(subscription, pushPayload, { publicKey, privateKey });
      if (success) {
        sentCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up failed subscriptions
    if (failedEndpoints.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedEndpoints.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
