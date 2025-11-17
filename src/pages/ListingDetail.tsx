import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferDialog } from "@/components/OfferDialog";
import { CreateBundleDialog } from "@/components/bundles/CreateBundleDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BundleRecommendation } from "@/components/BundleRecommendation";
import { AgentFeedbackButtons } from "@/components/AgentFeedbackButtons";
import { ArrowLeft, ShoppingBag, Package, Flag, Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { SellerReputation } from "@/components/seller/SellerReputation";
import { OutfitBuilder } from "@/components/OutfitBuilder";
import { useSavedListings } from "@/hooks/useSavedListings";
import { formatCondition } from "@/lib/format";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSaved, toggleSave, isSaving } = useSavedListings();
  const [selectedImage, setSelectedImage] = useState(0);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
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
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded" />
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

  if (!listing) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-2xl font-light text-foreground mb-4">Listing not found</h1>
          <Button variant="outline" onClick={() => navigate("/browse")}>
            Browse Items
          </Button>
        </div>
      </PageLayout>
    );
  }

  const images = listing.images?.sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <PageLayout>
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
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative">
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
                    className={`aspect-square bg-muted rounded overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? "border-primary" : "border-transparent"
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
              <h1 className="text-3xl font-light text-foreground mb-2">{listing.title}</h1>
              <p className="text-sm text-muted-foreground">{listing.brand}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-foreground">
                  £{Number(listing.seller_price).toFixed(2)}
                </span>
                {listing.original_rrp && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      £{Number(listing.original_rrp).toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round((1 - Number(listing.seller_price) / Number(listing.original_rrp)) * 100)}% off
                    </Badge>
                  </>
                )}
              </div>
              {listing.original_rrp && (
                <p className="text-xs text-muted-foreground">
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
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
              {listing.material && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Material</h3>
                  <p className="text-sm text-muted-foreground">{listing.material}</p>
                </div>
              )}
              {listing.brand && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Brand</h3>
                  <p className="text-sm text-muted-foreground">{listing.brand}</p>
                </div>
              )}
            </div>

            {/* Shipping Information */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Shipping & Delivery</h3>
              <div className="space-y-3">
                {listing.free_shipping ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Free Shipping
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Estimated delivery: {listing.estimated_delivery_days || 3} days
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">UK:</span>
                      <span className="font-medium">£{Number(listing.shipping_cost_uk || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Europe:</span>
                      <span className="font-medium">£{Number(listing.shipping_cost_europe || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">International:</span>
                      <span className="font-medium">£{Number(listing.shipping_cost_international || 0).toFixed(2)}</span>
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
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Package Details</h3>
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
                        {(listing.package_dimensions as any).length} × {(listing.package_dimensions as any).width} × {(listing.package_dimensions as any).height} cm
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Seller Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {listing.seller.avatar_url ? (
                      <img src={listing.seller.avatar_url} alt={listing.seller.full_name || "Seller"} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {listing.seller.full_name?.[0] || "S"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {listing.seller.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trust Score: {listing.seller.trust_score || 50}/100
                    </p>
                  </div>
                </div>
                <SellerReputation sellerId={listing.seller_id} compact />
              </div>
            </div>

            <div className="space-y-3">
              {user && user.id !== listing.seller_id && (
                <>
                  <BundleRecommendation listingId={listing.id} />
                  <OutfitBuilder listingId={listing.id} listingTitle={listing.title} />
                </>
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

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportedListingId={id}
      />
    </PageLayout>
  );
};

export default ListingDetail;