import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error("OneSignal credentials not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: NotificationPayload = await req.json();
    const { userId, userIds, title, message, url, data } = payload;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build target audience
    const targetUserIds = userIds || (userId ? [userId] : null);
    
    if (!targetUserIds || targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "userId or userIds required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notification via OneSignal REST API
    const notificationPayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: targetUserIds,
      },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
    };

    if (url) {
      notificationPayload.url = url;
    }

    if (data) {
      notificationPayload.data = data;
    }

    console.log("📤 Sending OneSignal notification:", {
      targetUserIds,
      title,
      message,
    });

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ OneSignal API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ OneSignal notification sent:", result);

    return new Response(
      JSON.stringify({ success: true, notificationId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
