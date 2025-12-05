// Supabase connection - uses fetch instead of SDK to avoid dependencies
const SUPABASE_URL = "https://ouvrgsvrkjxltbcwvuyz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnJnc3Zya2p4bHRiY3d2dXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjIwNDAsImV4cCI6MjA3ODczODA0MH0.ZJm-CVabXEK6QTR1FJAraRebtF6fX-fNkpD5ZcVCMCs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const orderBy = searchParams.get("orderBy") || "created_at";
    const ascending = searchParams.get("ascending") === "true";
    const search = searchParams.get("search") || "";

    // Build Supabase REST API query with correct column names
    // CRITICAL: profiles table has full_name NOT username
    let query = `${SUPABASE_URL}/rest/v1/listings?select=*,seller:profiles!seller_id(id,full_name,avatar_url,trust_score,verification_level,country),listing_images(image_url,display_order)&status=eq.active`;

    // Add search filter if provided
    if (search) {
      query += `&or=(title.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*)`;
    }

    // Add ordering
    query += `&order=${orderBy}.${ascending ? "asc" : "desc"}`;

    // Add limit
    query += `&limit=${limit}`;

    console.log("[API] Fetching from Supabase:", query);

    const response = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[API] Supabase response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Supabase error response:", errorText);
      console.error(
        "[API] Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      // Return more detailed error for debugging
      return Response.json(
        {
          error: "Failed to fetch listings",
          supabaseError: errorText,
          status: response.status,
          hint: "Check Supabase RLS policies for listings table",
        },
        { status: 500 },
      );
    }

    const listings = await response.json();
    console.log("[API] Got", listings.length, "listings from Supabase");
    if (listings.length > 0) {
      console.log(
        "[API] First listing sample:",
        JSON.stringify(listings[0], null, 2),
      );
    }

    // Sort listing_images by display_order
    const processedListings = listings.map((listing) => ({
      ...listing,
      listing_images: (listing.listing_images || []).sort(
        (a, b) => a.display_order - b.display_order,
      ),
    }));

    return Response.json(processedListings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    return Response.json(
      { error: "Failed to fetch listings", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, title, price, condition, description, images } = body;

    if (!user_id || !title || !price) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create listing in Supabase - use seller_id not user_id
    const listingData = {
      seller_id: user_id,
      title,
      price: parseFloat(price),
      condition: condition || "Near Mint",
      description: description || "",
      status: "active",
      views: 0,
    };

    const createListingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/listings`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(listingData),
      },
    );

    if (!createListingResponse.ok) {
      const errorText = await createListingResponse.text();
      console.error("Error creating listing:", errorText);
      throw new Error("Failed to create listing");
    }

    const [listing] = await createListingResponse.json();

    // Add images if provided
    if (images && images.length > 0) {
      const imageInserts = images.map((imageUrl, index) => ({
        listing_id: listing.id,
        image_url: imageUrl,
        display_order: index,
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/listing_images`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(imageInserts),
      });
    }

    return Response.json(listing, { status: 201 });
  } catch (error) {
    console.error("Error creating listing:", error);
    return Response.json(
      { error: "Failed to create listing" },
      { status: 500 },
    );
  }
}
