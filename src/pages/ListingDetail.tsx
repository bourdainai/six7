import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferDialog } from "@/components/OfferDialog";
import { TradeOfferModal } from "@/components/trade/TradeOfferModal";
import { MobileTradeBuilder } from "@/components/trade/MobileTradeBuilder";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { CreateBundleDialog } from "@/components/bundles/CreateBundleDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BundleRecommendation } from "@/components/BundleRecommendation";
import { AgentFeedbackButtons } from "@/components/AgentFeedbackButtons";
import { ArrowLeft, ShoppingBag, PackagePlus, Flag, Heart, ArrowLeftRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { SellerReputation } from "@/components/seller/SellerReputation";
import { SellerBadges } from "@/components/seller/SellerBadges";
import { TrustScore } from "@/components/seller/TrustScore";
import { useSavedListings } from "@/hooks/useSavedListings";
import { formatCondition } from "@/lib/format";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { SEO } from "@/components/SEO";
import { extractListingId, isOldFormatUrl, generateListingUrl } from "@/lib/listing-url";

type PackageDimensions = {
  length: number;
  width: number;
  height: number;
  unit: string;
};

const ListingDetail = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSaved, toggleSave, isSaving } = useSavedListings();
  const { isMobile } = useMobileDetect();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [tradeOfferOpen, setTradeOfferOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  
  // Extract actual listing ID from URL (supports both old and new formats)
  const extractedId = rawId ? extractListingId(rawId) : null;

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", extractedId],
    enabled: !!extractedId,
    queryFn: async () => {
      if (!extractedId) throw new Error("No listing ID");
      
      // Check if it's a short ID or full UUID
      const isShortId = extractedId.length === 8;
      
      let query = supabase
        .from("listings")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
          images:listing_images(image_url, display_order)
        `);
      
      let data, error;
      
      if (isShortId) {
        // Query by short ID using the generated short_id column
        const result = await query.eq("short_id", extractedId).maybeSingle();
        error = result.error;
        data = result.data;
        if (!data && !error) {
          throw new Error("Listing not found");
        }
      } else {
        // Query by full UUID
        const result = await query.eq("id", extractedId).maybeSingle();
        error = result.error;
        data = result.data;
      }
 
       if (error) throw error;

      // If listing has a card_id, fetch the Pokemon card image and number as fallback
      if (data.card_id) {
        const { data: cardData } = await supabase
          .from("pokemon_card_attributes")
          .select("images, number")
          .eq("card_id", data.card_id)
          .single();

        if (cardData?.images) {
          const images = typeof cardData.images === 'string' 
            ? JSON.parse(cardData.images) 
            : cardData.images;
          
          // Prepend the Pokemon card image to the listing images
          const cardImage = {
            image_url: images.large || images.small,
            display_order: -1, // Show first
          };
          
          data.images = [cardImage, ...(data.images || [])];
        }
        
        // Use card number from API as fallback if not stored in listing
        if (!data.card_number && cardData?.number) {
          data.card_number = cardData.number;
        }
      }

      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  
  // Fetch variants if listing has them
  const { data: variants } = useQuery({
    queryKey: ["listing-variants", listing?.id],
    enabled: !!listing?.id && listing?.has_variants === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_variants")
        .select("*")
        .eq("listing_id", listing!.id)
        .eq("is_available", true)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });
  
  // Auto-select first variant when variants load
  useEffect(() => {
    if (variants && variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0].id);
    }
  }, [variants, selectedVariant]);
  
  // Get current variant data
  const currentVariant = variants?.find(v => v.id === selectedVariant);
  
  // Update images when variant changes
  useEffect(() => {
    if (currentVariant && currentVariant.variant_images && Array.isArray(currentVariant.variant_images) && currentVariant.variant_images.length > 0) {
      setSelectedImage(0); // Reset to first image when variant changes
    }
  }, [currentVariant]);
  
  // Redirect old UUID format to new SEO-friendly format
  useEffect(() => {
    if (listing && rawId && isOldFormatUrl(rawId)) {
      const newUrl = generateListingUrl(
        listing.id,
        listing.title,
        listing.seller?.full_name
      );
      navigate(newUrl, { replace: true });
    }
  }, [listing, rawId, navigate]);

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase items",
        variant: "destructive",
      });
      return;
    }

    if (user.id === listing?.seller_id) {
      toast({
        title: "Cannot purchase own item",
        description: "You cannot buy your own listings",
        variant: "destructive",
      });
      return;
    }
    
    // For variant listings, ensure a variant is selected
    if (listing?.has_variants && !selectedVariant) {
      toast({
        title: "Please select a variant",
        description: "Choose which card you want to purchase",
        variant: "destructive",
      });
      return;
    }

    // Navigate to checkout with variant ID if applicable
    const checkoutUrl = selectedVariant 
      ? `/checkout/${listing?.id}?variant=${selectedVariant}`
      : `/checkout/${listing?.id}`;
    navigate(checkoutUrl);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <Skeleton className="aspect-[3/4] w-full" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!listing && !isLoading) {
    return (
      <PageLayout>
        <ErrorDisplay
          title="Listing not found"
          message="This listing doesn't exist or has been removed."
        />
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => navigate("/browse")}>
            Browse Items
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Determine which images to show: variant images or parent listing images
  const displayImages = currentVariant?.variant_images && Array.isArray(currentVariant.variant_images) && currentVariant.variant_images.length > 0
    ? currentVariant.variant_images.map((url, idx) => ({ image_url: url, display_order: idx }))
    : (listing?.images?.sort((a, b) => a.display_order - b.display_order) || []);
  
  const mainImage = displayImages[0]?.image_url || "";
  
  // Determine displayed price: variant price or parent listing price
  const displayPrice = currentVariant?.variant_price || listing?.seller_price || 0;
  const displayCondition = currentVariant?.variant_condition || listing?.condition;
  
  const seoUrl = generateListingUrl(listing?.id || "", listing?.title || "", listing?.seller?.full_name);
  const listingUrl = `https://6seven.io${seoUrl}`;
  
  // Build product structured data
  interface ProductStructuredData {
    "@context": string;
    "@type": string;
    name: string;
    description: string;
    image: string[];
    offers: {
      "@type": string;
      url: string;
      priceCurrency: string;
      price: string;
      availability: string;
      seller: {
        "@type": string;
        name: string;
      };
    };
    category: string;
    brand?: {
      "@type": string;
      name: string;
    };
    condition?: string;
  }

  const productStructuredData: ProductStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing?.title || "",
    "description": listing?.description || listing?.title || "",
    "image": displayImages.map(img => img.image_url),
    "offers": {
      "@type": "Offer",
      "url": listingUrl,
      "priceCurrency": "GBP",
      "price": displayPrice.toString(),
      "availability": listing?.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Person",
        "name": listing?.seller?.full_name || "Seller"
      }
    },
    "category": listing?.category || ""
  };
  
  // Add optional fields only if they exist
  if (listing?.brand) {
    productStructuredData.brand = {
      "@type": "Brand",
      "name": listing.brand
    };
  }
  
  if (displayCondition) {
    const conditionMap: Record<string, string> = {
      "new": "NewCondition",
      "new_with_tags": "NewCondition",
      "like_new": "NewCondition",
      "excellent": "ExcellentCondition",
      "good": "GoodCondition",
      "fair": "FairCondition",
      "poor": "PoorCondition"
    };
    const conditionType = conditionMap[displayCondition] || "UsedCondition";
    productStructuredData.condition = `https://schema.org/${conditionType}`;
  }

  return (
    <PageLayout>
      <SEO
        title={`${listing?.title} | ${listing?.category} | 6Seven`}
        description={listing?.description || `Buy ${listing?.title} on 6Seven. ${listing?.category}${listing?.brand ? ` by ${listing.brand}` : ''}. ${displayCondition ? `Condition: ${formatCondition(displayCondition)}.` : ''} ${listing?.has_variants ? `From £${displayPrice}` : `Price: £${displayPrice}`}.`}
        keywords={`${listing?.title}, ${listing?.category}, ${listing?.brand || ''}, buy ${listing?.category}, ${listing?.category} marketplace, 6Seven, resale, secondhand`}
        image={mainImage}
        url={listingUrl}
        canonical={listingUrl}
        type="product"
        structuredData={productStructuredData}
      />
        <button
          onClick={() => navigate("/browse")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Browse
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-[5/7] bg-soft-neutral border border-divider-gray overflow-hidden relative">
              {displayImages.length > 0 ? (
                <img
                  src={displayImages[selectedImage]?.image_url}
                  alt={listing?.title}
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="async"
                  width="800"
                  height="1120"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-[5/7] bg-soft-neutral overflow-hidden border transition-all duration-fast ${
                      selectedImage === idx ? "border-foreground" : "border-divider-gray"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${listing?.title} ${idx + 1}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                      width="200"
                      height="280"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-light text-foreground mb-2 tracking-tight">{listing?.title}</h1>
              <p className="text-sm text-muted-foreground font-normal">{listing?.brand}</p>
            </div>

            {/* Variant Selector - Show if has_variants is true */}
            {listing?.has_variants && variants && variants.length > 0 && (
              <div className="space-y-2 border border-border/50 rounded-lg p-4 bg-secondary/10">
                <label className="text-sm font-semibold text-foreground">Select Card</label>
                <Select value={selectedVariant || undefined} onValueChange={setSelectedVariant}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a card..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        <div className="flex items-center justify-between gap-4 w-full pr-4">
                          <span className="font-medium truncate">{variant.variant_name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {formatCondition(variant.variant_condition)}
                            </Badge>
                            <span className="font-semibold text-sm">£{Number(variant.variant_price).toFixed(2)}</span>
                            {variant.variant_quantity === 0 && (
                              <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentVariant && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Quantity available: {currentVariant.variant_quantity}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-foreground tracking-tight">
                  {listing?.has_variants && !selectedVariant ? 'From ' : ''}£{Number(displayPrice).toFixed(2)}
                </span>
                {listing?.original_rrp && (
                  <>
                    <span className="text-lg text-muted-foreground line-through font-normal">
                      £{Number(listing.original_rrp).toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round((1 - Number(displayPrice) / Number(listing.original_rrp)) * 100)}% off
                    </Badge>
                  </>
                )}
              </div>
              {listing.original_rrp && (
                <p className="text-xs text-muted-foreground font-normal">
                  Original price: £{Number(listing.original_rrp).toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {displayCondition && <Badge variant="secondary">{formatCondition(displayCondition)}</Badge>}
              {listing?.size && <Badge variant="outline">Size: {listing.size}</Badge>}
              {listing?.color && <Badge variant="outline">{listing.color}</Badge>}
              {listing?.category && <Badge variant="outline">{listing.category}</Badge>}
              {listing?.subcategory && <Badge variant="outline">{listing.subcategory}</Badge>}
              {listing?.has_variants && variants && (
                <Badge variant="outline">{variants.length} variants available</Badge>
              )}
            </div>

            {listing.style_tags && Array.isArray(listing.style_tags) && listing.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.style_tags.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {listing.description && (
              <div className="border-t border-divider-gray pt-6">
                <h3 className="text-sm font-normal text-foreground mb-2 tracking-tight">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-normal tracking-tight">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Multi-Card Bundle Contents */}
            {listing.category_attributes && 
             typeof listing.category_attributes === 'object' && 
             'is_bundle' in listing.category_attributes &&
             listing.category_attributes.is_bundle === true &&
             'cards' in listing.category_attributes &&
             Array.isArray(listing.category_attributes.cards) && (
              <div className="border-t border-divider-gray pt-6">
                <h3 className="text-sm font-normal text-foreground mb-4 tracking-tight flex items-center gap-2">
                  <PackagePlus className="w-4 h-4" />
                  Bundle Contents ({(listing.category_attributes.cards as any[]).length} cards)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(listing.category_attributes.cards as any[]).map((card: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg border border-border/50">
                      {card.image_url && (
                        <img 
                          src={card.image_url} 
                          alt={card.name}
                          className="w-12 h-16 object-cover rounded border border-border"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.set_code} • #{card.card_number}
                          {card.rarity && ` • ${card.rarity}`}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {card.condition && (
                            <Badge variant="secondary" className="text-xs">
                              {(card.condition as string).replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {card.quantity > 1 && (
                            <Badge variant="outline" className="text-xs">
                              Qty: {card.quantity}
                            </Badge>
                          )}
                          {card.market_price && (
                            <span className="text-xs text-muted-foreground">
                              ~£{(card.market_price * card.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {card.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">{card.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(listing.set_code || listing.card_number || listing.condition) && (
              <div className="grid grid-cols-2 gap-4 border-t border-divider-gray pt-6">
                {listing.set_code && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Set Code</h3>
                    <p className="text-sm text-muted-foreground font-normal">{listing.set_code}</p>
                  </div>
                )}
                {listing.card_number && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Card Number</h3>
                    <p className="text-sm text-muted-foreground font-normal">{listing.card_number}</p>
                  </div>
                )}
                {listing.condition && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Condition</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {formatCondition(listing.condition)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shipping Information */}
            <div className="border-t border-divider-gray pt-6">
              <h3 className="text-sm font-normal text-foreground mb-3 tracking-tight">Shipping & Delivery (UK Only)</h3>
              <div className="space-y-3">
                {listing.free_shipping ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Free UK Shipping
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Estimated delivery: {listing.estimated_delivery_days || 3} days
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">UK (Royal Mail / Couriers):</span>
                      <span className="font-medium">£{Number(listing.shipping_cost_uk || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Estimated delivery: {listing.estimated_delivery_days || 3} days
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Package Details */}
            {(listing.package_weight || listing.package_dimensions) && (
              <div className="border-t border-divider-gray pt-6">
                <h3 className="text-sm font-normal text-foreground mb-3 tracking-tight">Package Details</h3>
                <div className="space-y-2 text-sm">
                  {listing.package_weight && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">{Number(listing.package_weight).toFixed(2)} kg</span>
                    </div>
                  )}
                  {listing.package_dimensions && typeof listing.package_dimensions === 'object' && !Array.isArray(listing.package_dimensions) && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="font-medium">
                        {(listing.package_dimensions as PackageDimensions).length} × {(listing.package_dimensions as PackageDimensions).width} × {(listing.package_dimensions as PackageDimensions).height} cm
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-divider-gray pt-6">
              <h3 className="text-sm font-normal text-foreground mb-3 tracking-tight">Seller Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-soft-neutral flex items-center justify-center overflow-hidden border border-divider-gray">
                    {listing.seller.avatar_url ? (
                      <img src={listing.seller.avatar_url} alt={listing.seller.full_name || "Seller"} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground font-normal">
                        {listing.seller.full_name?.[0] || "S"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-normal text-foreground tracking-tight">
                      {listing.seller.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Trust Score: {listing.seller.trust_score || 50}/100
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <SellerReputation sellerId={listing.seller_id} compact />
                  <SellerBadges sellerId={listing.seller_id} size="sm" />
                  <TrustScore sellerId={listing.seller_id} compact />
                </div>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="space-y-2 border-t border-divider-gray pt-6">
              {user && user.id !== listing.seller_id && (
                <BundleRecommendation listingId={listing.id} />
              )}

              {user && user.id === listing.seller_id && (
                <Button
                  onClick={() => setBundleDialogOpen(true)}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  <PackagePlus className="mr-2 h-5 w-5" />
                  Create Bundle with This Item
                </Button>
              )}

              {/* Action buttons - always visible */}
              <>
                {user && user.id !== listing.seller_id && (
                  <Button
                    onClick={() => toggleSave(listing.id)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base font-medium"
                    disabled={isSaving}
                  >
                    <Heart 
                      className={`mr-2 h-5 w-5 ${isSaved(listing.id) ? "fill-current text-red-500" : ""}`} 
                    />
                    {isSaved(listing.id) ? "Saved" : "Save Item"}
                  </Button>
                )}

                <OfferDialog
                  listingId={listing.id}
                  listingPrice={listing.seller_price}
                  sellerId={listing.seller_id}
                />
                
                <Button
                  onClick={() => setTradeOfferOpen(true)}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  <ArrowLeftRight className="mr-2 h-5 w-5" />
                  Make Trade Offer
                </Button>

                <Button
                  onClick={handleBuyNow}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                  disabled={listing.status !== "active"}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {listing.status === "active" ? "Buy Now" : "Sold"}
                </Button>

                <Button
                  onClick={() => setReportDialogOpen(true)}
                  variant="ghost"
                  size="lg"
                  className="w-full h-12 text-base font-medium"
                >
                  <Flag className="mr-2 h-5 w-5" />
                  Report Listing
                </Button>

                {user && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm font-medium mb-3">Help us personalize your feed:</p>
                    <AgentFeedbackButtons listingId={listing.id} />
                  </div>
                )}
              </>
            </div>
          </div>
        </div>

      <CreateBundleDialog
        open={bundleDialogOpen}
        onOpenChange={setBundleDialogOpen}
        preselectedListings={[listing.id]}
      />

      {isMobile ? (
        <MobileTradeBuilder
          open={tradeOfferOpen}
          onOpenChange={setTradeOfferOpen}
          targetListing={listing}
        />
      ) : (
        <TradeOfferModal
          open={tradeOfferOpen}
          onOpenChange={setTradeOfferOpen}
          listingId={listing.id}
        />
      )}

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportedListingId={listing.id}
      />
    </PageLayout>
  );
};

export default ListingDetail;