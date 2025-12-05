// Supabase connection
const SUPABASE_URL = "https://ouvrgsvrkjxltbcwvuyz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnJnc3Zya2p4bHRiY3d2dXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjIwNDAsImV4cCI6MjA3ODczODA0MH0.ZJm-CVabXEK6QTR1FJAraRebtF6fX-fNkpD5ZcVCMCs";

export async function GET(request, { params }) {
  try {
    console.log("===== API /api/listings/[id] ROUTE HIT =====");

    // In Next.js 15, params needs to be awaited
    const resolvedParams = await params;
    const { id } = resolvedParams;

    console.log("Received ID:", id);
    console.log("ID type:", typeof id);
    console.log("Request URL:", request.url);

    if (!id) {
      console.error("No ID provided in params");
      return Response.json(
        { error: "Listing ID is required" },
        { status: 400 },
      );
    }

    // Fetch listing WITH seller info, images, AND variants
    const query = `${SUPABASE_URL}/rest/v1/listings?select=*,seller:profiles!seller_id(id,full_name,avatar_url,trust_score,verification_level,country),listing_images(id,image_url,display_order),listing_variants(id,variant_name,variant_price,variant_condition,variant_images,is_available,is_sold,display_order,variant_quantity,card_id)&id=eq.${id}`;

    console.log("Querying Supabase:", query);

    const response = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    console.log("Supabase response status:", response.status);
    console.log(
      "Supabase response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase error response:", errorText);
      return Response.json(
        {
          error: "Listing not found",
          supabaseError: errorText,
          queriedId: id,
        },
        { status: 404 },
      );
    }

    const result = await response.json();
    console.log("Supabase returned", result.length, "results");
    console.log("Raw Supabase result:", JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.error("❌ No listing found with ID:", id);
      console.error("This means the ID doesn't exist in Supabase");
      return Response.json(
        {
          error: "Listing not found",
          detail: `No listing with ID ${id} exists in database`,
          queriedId: id,
        },
        { status: 404 },
      );
    }

    const listing = result[0];
    console.log("Found listing:", listing.title);

    // Sort images by display_order
    if (listing.listing_images) {
      listing.listing_images.sort((a, b) => a.display_order - b.display_order);
    }

    // Sort variants by display_order
    if (listing.listing_variants) {
      listing.listing_variants.sort(
        (a, b) => a.display_order - b.display_order,
      );
    }

    console.log("Returning listing successfully");
    console.log("==========================================");

    // Increment view count (fire and forget)
    fetch(`${SUPABASE_URL}/rest/v1/listings?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ views: (listing.views || 0) + 1 }),
    }).catch((err) => console.error("Failed to increment view count:", err));

    return Response.json(listing);
  } catch (error) {
    console.error("===== API ERROR =====");
    console.error("Error fetching listing:", error);
    console.error("Error stack:", error.stack);
    console.error("=====================");
    return Response.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}
