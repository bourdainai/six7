import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Package, Heart, Share2, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useSavedListings } from "@/hooks/useSavedListings";
import { useSavedBundles } from "@/hooks/useSavedBundles";
import { ListingCard } from "@/components/ListingCard";

export default function BundleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSaved: isListingSaved, toggleSave: toggleListingSave } = useSavedListings();
  const { isSaved: isBundleSaved, toggleSave: toggleBundleSave } = useSavedBundles();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: bundle, isLoading } = useQuery({
    queryKey: ["bundle", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("No bundle ID");

      const { data, error } = await supabase
        .from("bundles")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
          bundle_items(
            listing:listings(
              id,
              title,
              seller_price,
              condition,
              status,
              listing_images(image_url, display_order)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleBuyBundle = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase this bundle",
        variant: "destructive",
      });
      return;
    }

    if (!bundle) return;

    // TODO: Implement bundle checkout flow
    // For now, redirect to first listing checkout as placeholder
    if (bundle.bundle_items && bundle.bundle_items.length > 0) {
      const firstListing = bundle.bundle_items[0]?.listing;
      if (firstListing) {
        navigate(`/checkout/${firstListing.id}?bundle=${id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!bundle) {
    return (
      <PageLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Bundle Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This bundle may have been removed or is no longer available.
              </p>
              <Button onClick={() => navigate("/bundles")}>Back to Bundles</Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const bundleItems = bundle.bundle_items || [];
  const listingIds = bundleItems.map((item: any) => item.listing?.id).filter(Boolean);
  
  // Get all images from bundle items
  const allImages = bundleItems.flatMap((item: any) => 
    item.listing?.listing_images?.map((img: any) => img.image_url) || []
  ).filter(Boolean);

  // Calculate original price from all listings
  const originalPrice = bundleItems.reduce(
    (sum: number, item: any) => sum + Number(item.listing?.seller_price || 0),
    0
  );
  const savings = originalPrice - Number(bundle.total_price);
  const savingsPercentage = originalPrice > 0 ? ((savings / originalPrice) * 100).toFixed(0) : 0;

  // Check if bundle is saved using the new useSavedBundles hook
  const bundleSaved = isBundleSaved(bundle?.id || "");

  return (
    <PageLayout>
      <SEO
        title={`${bundle.title} | Bundle | 6Seven`}
        description={bundle.description || `Buy ${bundle.title} bundle on 6Seven. Save ${savingsPercentage}% on ${bundleItems.length} items.`}
        keywords={`${bundle.title}, bundle, pokemon cards bundle, save money, ${bundleItems.length} items, 6Seven`}
        image={allImages[0]}
      />
      
      <div className="container py-4 md:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/bundles")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bundles
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImageIndex] || allImages[0]}
                  alt={bundle.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 8).map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-md overflow-hidden border-2 ${
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${bundle.title} ${index + 1}`}
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
              <h1 className="text-3xl font-bold mb-2">{bundle.title}</h1>
              <p className="text-muted-foreground mb-4">{bundle.description}</p>
              
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary">{bundleItems.length} items</Badge>
                {bundle.discount_percentage > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {bundle.discount_percentage}% OFF
                  </Badge>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">
                  £{Number(bundle.total_price).toFixed(2)}
                </span>
                {originalPrice > Number(bundle.total_price) && (
                  <span className="text-xl text-muted-foreground line-through">
                    £{originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              
              {savings > 0 && (
                <p className="text-green-600 font-semibold">
                  Save £{savings.toFixed(2)} ({savingsPercentage}%)
                </p>
              )}
            </div>

            {/* Seller Info */}
            {bundle.seller && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    {bundle.seller.avatar_url ? (
                      <img
                        src={bundle.seller.avatar_url}
                        alt={bundle.seller.full_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {bundle.seller.full_name?.[0]?.toUpperCase() || "S"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{bundle.seller.full_name}</p>
                      {bundle.seller.trust_score && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <span>Trust Score: {bundle.seller.trust_score}/100</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleBuyBundle}
                size="lg"
                className="w-full"
                disabled={bundle.status !== "active"}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                {bundle.status === "active" ? "Buy Bundle" : "Bundle Unavailable"}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => toggleBundleSave(bundle.id)}
                  className="flex-1"
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${
                      bundleSaved ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                  {bundleSaved ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bundle Items */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Items in This Bundle</h2>
          
          {bundleItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No items in this bundle</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundleItems.map((item: any) => {
                const listing = item.listing;
                if (!listing) return null;
                
                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                  >
                    {listing.listing_images?.[0]?.image_url && (
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={listing.listing_images[0].image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                      {listing.condition && (
                        <CardDescription>{listing.condition}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">£{Number(listing.seller_price).toFixed(2)}</p>
                      {listing.status !== "active" && (
                        <Badge variant="destructive" className="mt-2">
                          {listing.status}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
