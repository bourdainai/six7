// Debug endpoint to check listings in database
const SUPABASE_URL = "https://ouvrgsvrkjxltbcwvuyz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnJnc3Zya2p4bHRiY3d2dXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjIwNDAsImV4cCI6MjA3ODczODA0MH0.ZJm-CVabXEK6QTR1FJAraRebtF6fX-fNkpD5ZcVCMCs";

export async function GET() {
  try {
    console.log("\n======= DATABASE DEBUG =======");

    // Get ALL listings (no filters) with ALL data
    const query = `${SUPABASE_URL}/rest/v1/listings?select=*,seller:profiles!seller_id(id,full_name,avatar_url,trust_score,verification_level),listing_images(image_url,display_order)`;

    console.log("Query URL:", query);

    const response = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return Response.json(
        {
          error: "Supabase query failed",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const listings = await response.json();

    console.log(`\nFound ${listings.length} listings in database`);

    if (listings.length === 0) {
      console.log("⚠️  NO LISTINGS FOUND IN DATABASE!");
      console.log("This means the listings table is empty");
      console.log("==============================\n");
      return Response.json({
        message: "No listings found in database",
        count: 0,
        listings: [],
      });
    }

    // Log detailed info about each listing
    listings.forEach((listing, index) => {
      console.log(`\n--- Listing #${index + 1} ---`);
      console.log("ID:", listing.id);
      console.log("ID type:", typeof listing.id);
      console.log("Title:", listing.title);
      console.log("Price:", listing.seller_price || listing.price);
      console.log("Condition:", listing.condition);
      console.log("Status:", listing.status);
      console.log("Seller ID:", listing.seller_id);
      console.log("Seller name:", listing.seller?.full_name);
      console.log("Images count:", listing.listing_images?.length || 0);
      console.log("Created at:", listing.created_at);
      console.log("Full data:", JSON.stringify(listing, null, 2));
    });

    console.log("\n==============================\n");

    return Response.json({
      message: `Found ${listings.length} listings`,
      count: listings.length,
      listings: listings.map((l) => ({
        id: l.id,
        id_type: typeof l.id,
        title: l.title,
        price: l.seller_price || l.price,
        condition: l.condition,
        status: l.status,
        seller_id: l.seller_id,
        seller_name: l.seller?.full_name,
        images_count: l.listing_images?.length || 0,
        created_at: l.created_at,
        full_listing: l,
      })),
    });
  } catch (error) {
    console.error("\n❌ DEBUG ERROR:", error);
    console.error("Stack:", error.stack);
    console.log("==============================\n");

    return Response.json(
      {
        error: "Debug check failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
