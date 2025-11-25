import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingNotificationRequest {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  items: Array<{ title: string; price: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buyerEmail, buyerName, orderId, trackingNumber, carrier, items }: ShippingNotificationRequest = await req.json();

    const itemsList = items.map(item => `<li>${item.title} - £${item.price}</li>`).join('');

    const emailResponse = await resend.emails.send({
      from: "6seven.io Orders <orders@6seven.io>",
      to: [buyerEmail],
      subject: `Your order #${orderId.slice(0, 8)} has been shipped! 📦`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
            Your Order Has Shipped! 🎉
          </h1>
          
          <p style="font-size: 16px; color: #555;">Hi ${buyerName || 'there'},</p>
          
          <p style="font-size: 16px; color: #555;">
            Great news! Your order has been shipped and is on its way to you.
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Shipping Details</h2>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 5px 0;"><strong>Carrier:</strong> ${carrier}</p>
            <p style="margin: 5px 0;"><strong>Tracking Number:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${trackingNumber}</code></p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Items in this order:</h3>
            <ul style="list-style-type: none; padding: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #888; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            Track your shipment with ${carrier} using the tracking number above.
          </p>
          
          <p style="font-size: 14px; color: #888;">
            If you have any questions, please don't hesitate to contact the seller.
          </p>
        </div>
      `,
    });

    console.log("Shipping notification sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error sending shipping notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
