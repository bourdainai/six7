"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/listings?limit=50");
      if (!response.ok) {
        throw new Error("Failed to load listings");
      }
      const data = await response.json();
      setListings(data);
    } catch (error) {
      console.error("Error loading listings:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path) => {
    window.location.href = path;
  };

  const conditionLabels = {
    mint: "Mint",
    near_mint: "Near Mint",
    excellent: "Excellent",
    good: "Good",
    light_played: "Light Played",
    played: "Played",
    poor: "Poor",
    like_new: "Like New",
  };

  const filteredListings = listings.filter((listing) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.title?.toLowerCase().includes(query) ||
      listing.description?.toLowerCase().includes(query) ||
      listing.category?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigateTo("/")}
              className="text-2xl font-bold hover:opacity-80"
            >
              SCVEN
            </button>
            <nav className="flex gap-6">
              <button
                onClick={() => navigateTo("/")}
                className="text-gray-700 hover:text-black font-medium"
              >
                Browse
              </button>
              <button
                onClick={() => navigateTo("/sell")}
                className="text-gray-700 hover:text-black font-medium"
              >
                Sell
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo("/account/signin")}
              className="text-gray-700 hover:text-black font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => navigateTo("/account/signup")}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Search Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-5xl font-bold mb-4">Browse Trading Cards</h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover, buy, and trade authentic cards
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for cards, sets, or other..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl text-base focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {filteredListings.length}{" "}
            {filteredListings.length === 1 ? "listing" : "listings"}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading listings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">
              Couldn't load listings
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadListings}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900"
            >
              Try Again
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No results found" : "No listings yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "Try adjusting your search"
                : "Be the first to list an item"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => {
              const imageUrl =
                listing.listing_images?.[0]?.image_url ||
                "https://images.pokemontcg.io/swsh4/20_hires.png";
              const isBundle =
                listing.is_bundle && listing.listing_images?.length > 1;

              return (
                <button
                  key={listing.id}
                  onClick={() => navigateTo(`/listing/${listing.id}`)}
                  className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow text-left relative"
                >
                  {/* Multi-Card Badge */}
                  {isBundle && (
                    <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 rounded text-xs font-semibold z-10">
                      Multi-Card
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative bg-gray-50 p-8 aspect-[0.7]">
                    <img
                      src={imageUrl}
                      alt={listing.title}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Details */}
                  <div className="p-4 bg-white border-t border-gray-200">
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">
                      {listing.title}
                    </h3>

                    {/* Category & Condition */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <span>{listing.category || "Pokémon"}</span>
                      {listing.condition && (
                        <>
                          <span>•</span>
                          <span>
                            {conditionLabels[listing.condition] ||
                              listing.condition}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-2xl font-bold">
                      {isBundle && "From "}£
                      {listing.seller_price || listing.price || 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
