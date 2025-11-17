import { PageLayout } from "@/components/PageLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { SellerReputation } from "@/components/seller/SellerReputation";
import { useSavedListings } from "@/hooks/useSavedListings";

const SavedItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved, toggleSave, isSaving } = useSavedListings();

  const { data: savedListings, isLoading } = useQuery({
    queryKey: ["saved-listings-full", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_listings")
        .select(`
          listing_id,
          created_at,
          listing:listings!inner(
            id,
            title,
            description,
            brand,
            size,
            color,
            condition,
            seller_price,
            original_rrp,
            status,
            images:listing_images(image_url, display_order),
            seller:profiles!seller_id(id, full_name, trust_score)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((item) => item.listing).filter(Boolean);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-light text-foreground mb-4">Sign in to view saved items</h1>
          <p className="text-muted-foreground mb-6">Please sign in to see your saved listings</p>
          <Button onClick={() => navigate("/")}>Go to Homepage</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-light text-foreground">Saved Items</h1>
            <p className="text-base text-muted-foreground font-light">
              {savedListings?.length || 0} {savedListings?.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : savedListings && savedListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedListings.map((listing: any) => {
            const firstImage = listing.images?.sort(
              (a: any, b: any) => a.display_order - b.display_order
            )[0];

            return (
              <div key={listing.id} className="group relative">
                <button
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  className="text-left w-full"
                >
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-3 relative">
                    {firstImage ? (
                      <img
                        src={firstImage.image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="533"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                    {listing.status !== "active" && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Badge variant="secondary" className="text-sm">
                          {listing.status === "sold" ? "Sold" : "Unavailable"}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {listing.brand}
                      </p>
                      {listing.condition && (
                        <Badge variant="secondary" className="text-xs">
                          {listing.condition.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <p className="text-base font-medium text-foreground">
                        £{Number(listing.seller_price).toFixed(2)}
                      </p>
                      {listing.original_rrp && (
                        <p className="text-xs text-muted-foreground line-through">
                          £{Number(listing.original_rrp).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {listing.size && (
                      <p className="text-xs text-muted-foreground">Size: {listing.size}</p>
                    )}

                    {listing.seller?.id && (
                      <div className="pt-1">
                        <SellerReputation sellerId={listing.seller.id} compact />
                      </div>
                    )}
                  </div>
                </button>

                {/* Remove from saved */}
                <div className="mt-3 flex items-center justify-end gap-2 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(listing.id);
                    }}
                    disabled={isSaving}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-xs">Remove</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-light text-foreground mb-2">No saved items yet</h2>
          <p className="text-muted-foreground mb-6">
            Start saving items you love to view them here later
          </p>
          <Button onClick={() => navigate("/browse")}>
            Browse Items
          </Button>
        </div>
      )}
    </PageLayout>
  );
};

export default SavedItems;

