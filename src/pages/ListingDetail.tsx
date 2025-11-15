import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { OfferDialog } from "@/components/OfferDialog";
import { CreateBundleDialog } from "@/components/bundles/CreateBundleDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BundleRecommendation } from "@/components/BundleRecommendation";
import { AgentFeedbackButtons } from "@/components/AgentFeedbackButtons";
import { ArrowLeft, ShoppingBag, Package, Flag } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { SellerReputation } from "@/components/seller/SellerReputation";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-lg mb-8"></div>
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl font-light text-foreground mb-4">Listing not found</h1>
          <Button variant="outline" onClick={() => navigate("/browse")}>
            Browse Items
          </Button>
        </div>
      </div>
    );
  }

  const images = listing.images?.sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
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
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.image_url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
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

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-light text-foreground">
                £{Number(listing.seller_price).toFixed(2)}
              </span>
              {listing.original_rrp && (
                <span className="text-lg text-muted-foreground line-through">
                  £{Number(listing.original_rrp).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {listing.condition && <Badge variant="secondary">{listing.condition}</Badge>}
              {listing.size && <Badge variant="outline">Size: {listing.size}</Badge>}
              {listing.color && <Badge variant="outline">{listing.color}</Badge>}
              {listing.category && <Badge variant="outline">{listing.category}</Badge>}
            </div>

            {listing.description && (
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.material && (
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground mb-2">Material</h3>
                <p className="text-sm text-muted-foreground">{listing.material}</p>
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

              {user && user.id !== listing.seller_id && (
                <>
                  <OfferDialog
                    listingId={listing.id}
                    listingPrice={listing.seller_price}
                    sellerId={listing.seller_id}
                    buyerId={user.id}
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

                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm font-medium mb-3">Help us personalize your feed:</p>
                    <AgentFeedbackButtons listingId={listing.id} />
                  </div>
                </>
              )}
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
    </div>
      </div>
    </div>
  );
};

export default ListingDetail;