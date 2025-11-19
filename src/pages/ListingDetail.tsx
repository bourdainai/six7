import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferDialog } from "@/components/OfferDialog";
import { TradeOfferModal } from "@/components/trade/TradeOfferModal";
import { CreateBundleDialog } from "@/components/bundles/CreateBundleDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BundleRecommendation } from "@/components/BundleRecommendation";
import { AgentFeedbackButtons } from "@/components/AgentFeedbackButtons";
import { ArrowLeft, ShoppingBag, Package, Flag, Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { SellerReputation } from "@/components/seller/SellerReputation";
import { SellerBadges } from "@/components/seller/SellerBadges";
import { TrustScore } from "@/components/seller/TrustScore";
import { useSavedListings } from "@/hooks/useSavedListings";
import { formatCondition } from "@/lib/format";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { SEO } from "@/components/SEO";

type PackageDimensions = {
  length: number;
  width: number;
  height: number;
  unit: string;
};

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSaved, toggleSave, isSaving } = useSavedListings();
  const [selectedImage, setSelectedImage] = useState(0);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [tradeOfferOpen, setTradeOfferOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
          images:listing_images(image_url, display_order)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

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

    navigate(`/checkout/${id}`);
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

  const images = listing.images?.sort((a, b) => a.display_order - b.display_order) || [];
  const mainImage = images[0]?.image_url || "";
  const listingUrl = `https://6seven.ai/listing/${id}`;
  
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
    "name": listing.title,
    "description": listing.description || listing.title,
    "image": images.map(img => img.image_url),
    "offers": {
      "@type": "Offer",
      "url": listingUrl,
      "priceCurrency": "GBP",
      "price": listing.seller_price.toString(),
      "availability": listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Person",
        "name": listing.seller?.full_name || "Seller"
      }
    },
    "category": listing.category
  };
  
  // Add optional fields only if they exist
  if (listing.brand) {
    productStructuredData.brand = {
      "@type": "Brand",
      "name": listing.brand
    };
  }
  
  if (listing.condition) {
    const conditionMap: Record<string, string> = {
      "new": "NewCondition",
      "like_new": "NewCondition",
      "excellent": "ExcellentCondition",
      "good": "GoodCondition",
      "fair": "FairCondition",
      "poor": "PoorCondition"
    };
    const conditionType = conditionMap[listing.condition] || "UsedCondition";
    productStructuredData.condition = `https://schema.org/${conditionType}`;
  }

  return (
    <PageLayout>
      <SEO
        title={`${listing.title} | ${listing.category} | 6Seven`}
        description={listing.description || `Buy ${listing.title} on 6Seven. ${listing.category}${listing.brand ? ` by ${listing.brand}` : ''}. ${listing.condition ? `Condition: ${formatCondition(listing.condition)}.` : ''} Price: £${listing.seller_price}.`}
        keywords={`${listing.title}, ${listing.category}, ${listing.brand || ''}, buy ${listing.category}, ${listing.category} marketplace, 6Seven, resale, secondhand`}
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
            <div className="aspect-[3/4] bg-soft-neutral border border-divider-gray overflow-hidden relative">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.image_url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  width="800"
                  height="1067"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square bg-soft-neutral overflow-hidden border transition-all duration-fast ${
                      selectedImage === idx ? "border-foreground" : "border-divider-gray"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${listing.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width="200"
                      height="200"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-light text-foreground mb-2 tracking-tight">{listing.title}</h1>
              <p className="text-sm text-muted-foreground font-normal">{listing.brand}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-foreground tracking-tight">
                  £{Number(listing.seller_price).toFixed(2)}
                </span>
                {listing.original_rrp && (
                  <>
                    <span className="text-lg text-muted-foreground line-through font-normal">
                      £{Number(listing.original_rrp).toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round((1 - Number(listing.seller_price) / Number(listing.original_rrp)) * 100)}% off
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
              {listing.condition && <Badge variant="secondary">{formatCondition(listing.condition)}</Badge>}
              {listing.size && <Badge variant="outline">Size: {listing.size}</Badge>}
              {listing.color && <Badge variant="outline">{listing.color}</Badge>}
              {listing.category && <Badge variant="outline">{listing.category}</Badge>}
              {listing.subcategory && <Badge variant="outline">{listing.subcategory}</Badge>}
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

            {(listing.set_code || listing.rarity || listing.condition || listing.grading_service) && (
              <div className="grid grid-cols-2 gap-4 border-t border-divider-gray pt-6">
                {listing.set_code && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Set Code</h3>
                    <p className="text-sm text-muted-foreground font-normal">{listing.set_code}</p>
                  </div>
                )}
                {listing.rarity && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Rarity</h3>
                    <p className="text-sm text-muted-foreground font-normal">{listing.rarity}</p>
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
                {listing.grading_service && (
                  <div>
                    <h3 className="text-sm font-normal text-foreground mb-1 tracking-tight">Grading</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {listing.grading_service}
                      {listing.grading_score && ` ${Number(listing.grading_score).toFixed(1)}`}
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

            <div className="space-y-3">
              {user && user.id !== listing.seller_id && (
                <BundleRecommendation listingId={listing.id} />
              )}

              {user && user.id === listing.seller_id && (
                <Button
                  onClick={() => setBundleDialogOpen(true)}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  <Package className="mr-2 h-5 w-5" />
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
                    className="w-full h-12"
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
                  variant="secondary"
                  className="w-full h-12"
                  size="lg"
                >
                  <Package className="mr-2 h-5 w-5" />
                  Make Trade Offer
                </Button>

                <Button
                  onClick={handleBuyNow}
                  className="w-full h-12"
                  size="lg"
                  disabled={listing.status !== "active"}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {listing.status === "active" ? "Buy Now" : "Sold"}
                </Button>

                <Button
                  onClick={() => setReportDialogOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <Flag className="mr-2 h-4 w-4" />
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
        preselectedListings={[id!]}
      />

      <TradeOfferModal
        open={tradeOfferOpen}
        onOpenChange={setTradeOfferOpen}
        listingId={id}
      />

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportedListingId={id}
      />
    </PageLayout>
  );
};

export default ListingDetail;