"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, MapPin, Package, ChevronDown } from "lucide-react";

export default function ListingDetailPage({ params }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState("bundle"); // 'bundle' or 'individual'
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  useEffect(() => {
    loadListing();
  }, [params.id]);

  const loadListing = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Loading listing:", params.id);

      const response = await fetch(`/api/listings/${params.id}`);
      if (!response.ok) {
        throw new Error(`Failed to load listing: ${response.status}`);
      }

      const data = await response.json();
      console.log("Loaded listing:", data);
      setListing(data);
    } catch (error) {
      console.error("Error loading listing:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const navigateTo = (path) => {
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Listing not found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigateTo("/")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const images = listing.listing_images || [];
  const currentImage =
    images[selectedImage]?.image_url ||
    "https://images.pokemontcg.io/swsh4/20_hires.png";

  // Check if this is a bundle with variants
  const isBundle = listing.has_variants && listing.listing_variants?.length > 0;
  const variants = (listing.listing_variants || []).filter(
    (v) => v.is_available && !v.is_sold,
  );

  // Calculate bundle pricing from variants
  const bundlePrice = listing.seller_price || listing.price || 0;
  const individualTotal = isBundle
    ? variants.reduce((sum, v) => sum + (parseFloat(v.variant_price) || 0), 0)
    : bundlePrice;

  // Use bundle_discount_percentage from listing
  const discountPercentage = listing.bundle_discount_percentage || 0;
  const calculatedBundlePrice =
    individualTotal * (1 - discountPercentage / 100);
  const savings = individualTotal - calculatedBundlePrice;

  const selectedVariant = variants[selectedVariantIndex];
  const displayPrice =
    purchaseMode === "bundle"
      ? bundlePrice
      : selectedVariant?.variant_price || bundlePrice;

  const conditionLabels = {
    mint: "Mint",
    near_mint: "Near Mint",
    excellent: "Excellent",
    good: "Good",
    light_played: "Light Played",
    played: "Played",
    poor: "Poor",
    like_new: "Like New",
    new_with_tags: "New With Tags",
  };

  const verificationLabels = {
    basic: "basic",
    verified: "verified",
    trusted: "trusted",
    premium: "premium",
  };

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Browse</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Images */}
          <div>
            {/* Main Image */}
            <div className="bg-gray-50 rounded-2xl p-12 mb-4">
              <img
                src={currentImage}
                alt={listing.title}
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-1 bg-gray-50 rounded-lg p-4 border-2 transition-all ${
                      selectedImage === idx
                        ? "border-black"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${listing.title} ${idx + 1}`}
                      className="w-full h-24 object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div>
            {/* Multi-Card Badge */}
            {isBundle && (
              <div className="inline-block bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm mb-4">
                {variants.length} Card Bundle
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold mb-6">{listing.title}</h1>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {listing.condition && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {conditionLabels[listing.condition] || listing.condition}
                </span>
              )}
              {listing.category && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {listing.category}
                </span>
              )}
            </div>

            {/* Bundle Purchase Options */}
            {isBundle ? (
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200">
                {/* Bundle Deal Option */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="bundle"
                        name="purchase"
                        checked={purchaseMode === "bundle"}
                        onChange={() => setPurchaseMode("bundle")}
                        className="w-5 h-5 accent-black mt-1"
                      />
                      <label htmlFor="bundle" className="cursor-pointer">
                        <div className="font-bold text-lg text-black">
                          Buy All {variants.length} Cards Together
                        </div>
                        <div className="text-sm text-gray-600">Bundle Deal</div>
                      </label>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-3xl text-black">
                        £{bundlePrice.toFixed(2)}
                      </div>
                      {savings > 0 && (
                        <div className="font-semibold text-sm text-green-600">
                          Save {discountPercentage}%
                        </div>
                      )}
                    </div>
                  </div>

                  {purchaseMode === "bundle" && (
                    <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-200">
                      <div className="font-semibold text-sm text-black mb-2">
                        Bundle includes:
                      </div>
                      {variants.map((variant, idx) => (
                        <div
                          key={variant.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <div className="text-black">
                            <span className="font-medium">
                              {variant.variant_name || `Card ${idx + 1}`}
                            </span>
                            {variant.variant_condition && (
                              <span className="text-gray-600 ml-2">
                                (
                                {conditionLabels[variant.variant_condition] ||
                                  variant.variant_condition}
                                )
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-gray-700">
                            £{(variant.variant_price || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                        <div className="font-medium text-sm text-gray-600">
                          Individual total:
                        </div>
                        <div className="font-semibold text-gray-600 line-through">
                          £{individualTotal.toFixed(2)}
                        </div>
                      </div>
                      {savings > 0 && (
                        <div className="flex justify-between items-center">
                          <div className="font-semibold text-sm text-green-600">
                            Bundle discount:
                          </div>
                          <div className="font-bold text-green-600">
                            -£{savings.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Individual Card Purchase Option */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="radio"
                      id="individual"
                      name="purchase"
                      checked={purchaseMode === "individual"}
                      onChange={() => setPurchaseMode("individual")}
                      className="w-5 h-5 accent-black"
                    />
                    <label
                      htmlFor="individual"
                      className="cursor-pointer font-bold text-lg text-black"
                    >
                      Or Buy Individual Cards
                    </label>
                  </div>

                  {purchaseMode === "individual" && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="mb-4">
                        <label className="block font-medium text-sm text-gray-600 mb-2">
                          Select a card:
                        </label>
                        <div className="relative">
                          <select
                            value={selectedVariantIndex}
                            onChange={(e) => {
                              const idx = Number(e.target.value);
                              setSelectedVariantIndex(idx);
                              // Update image to show variant's first image if available
                              if (variants[idx]?.variant_images?.[0]) {
                                // Find matching image index or keep current
                                setSelectedImage(idx < images.length ? idx : 0);
                              }
                            }}
                            className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-black appearance-none cursor-pointer hover:border-gray-400 focus:border-black focus:outline-none"
                          >
                            {variants.map((variant, idx) => (
                              <option key={variant.id} value={idx}>
                                {variant.variant_name || `Card ${idx + 1}`}{" "}
                                {variant.variant_condition &&
                                  `- ${conditionLabels[variant.variant_condition] || variant.variant_condition}`}{" "}
                                - £{(variant.variant_price || 0).toFixed(2)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={20}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <div className="font-semibold text-black">
                          Selected card price:
                        </div>
                        <div className="font-bold text-2xl text-black">
                          £{(selectedVariant?.variant_price || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Single Card Price
              <div className="text-4xl font-bold mb-6">
                £{displayPrice.toFixed(2)}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-3">Description</h3>
                <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {listing.description}
                </div>
              </div>
            )}

            {/* Shipping */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <div className="flex items-start gap-3 mb-2">
                <Package size={20} className="text-gray-600 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Shipping & Delivery</h3>
                  <p className="text-sm text-gray-600 mb-2">UK Only</p>
                  <div className="text-sm">
                    <p className="font-medium">
                      UK (Royal Mail / Couriers): £2.99
                    </p>
                    <p className="text-gray-600">Estimated delivery: 3 days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Profile */}
            <div className="border border-gray-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Seller Profile</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {listing.seller?.avatar_url ? (
                    <img
                      src={listing.seller.avatar_url}
                      alt={listing.seller.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-600">
                      {listing.seller?.full_name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">
                      {listing.seller?.full_name || "Anonymous"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield size={16} className="text-gray-600" />
                    <span className="text-gray-700">
                      Trust Score: {listing.seller?.trust_score || 0}/100
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {verificationLabels[listing.seller?.verification_level] ||
                        "basic"}
                    </span>
                  </div>
                  {listing.seller?.country && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin size={14} />
                      <span>{listing.seller.country}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigateTo(`/seller/${listing.seller_id}`)}
                className="w-full py-3 border-2 border-gray-300 rounded-lg font-semibold hover:border-black transition-colors"
              >
                View Seller Profile
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => alert("Make Offer feature coming soon!")}
                className="w-full py-4 border-2 border-gray-300 rounded-lg font-semibold hover:border-black transition-colors"
              >
                Make Offer
              </button>
              <button
                onClick={() => alert("Make Trade Offer feature coming soon!")}
                className="w-full py-4 border-2 border-gray-300 rounded-lg font-semibold hover:border-black transition-colors"
              >
                Make Trade Offer
              </button>
              <button
                onClick={() => {
                  if (isBundle) {
                    if (purchaseMode === "bundle") {
                      alert(
                        `Purchasing full bundle (${variants.length} cards) for £${bundlePrice.toFixed(2)}`,
                      );
                    } else {
                      alert(
                        `Purchasing ${selectedVariant?.variant_name || "card"} for £${(selectedVariant?.variant_price || 0).toFixed(2)}`,
                      );
                    }
                  } else {
                    alert(`Purchasing for £${displayPrice.toFixed(2)}`);
                  }
                }}
                className="w-full py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                {isBundle && purchaseMode === "individual"
                  ? "Buy Selected Card Only"
                  : "Buy Now"}
              </button>
            </div>

            {/* Report Listing */}
            <div className="text-center mt-6">
              <button
                onClick={() => alert("Report Listing feature coming soon!")}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Report Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
