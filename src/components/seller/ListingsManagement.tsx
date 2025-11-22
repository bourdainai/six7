import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateListingUrl } from "@/lib/listing-url";

interface ListingImage {
  image_url: string;
  display_order: number | null;
}

interface Listing {
  id: string;
  title: string;
  status: string;
  seller_price: number;
  created_at: string | null;
  listing_images?: ListingImage[];
  images?: ListingImage[];
  set_code?: string | null;
  card_number?: string | null;
  card_id?: string | null;
}
 
interface ListingsManagementProps {
  listings: Listing[];
  onDelete: (listingId: string) => void;
  isDeleting: boolean;
}

export const ListingsManagement = ({ listings, onDelete, isDeleting }: ListingsManagementProps) => {
  const navigate = useNavigate();

  const getListingImages = (listing: Listing): ListingImage[] => {
    const anyListing = listing as Listing & { images?: ListingImage[] };
    if (Array.isArray(anyListing.images)) return anyListing.images;
    if (Array.isArray(anyListing.listing_images)) return anyListing.listing_images;
    return [];
  };

  const getCardImageUrl = (listing: Listing): string | null => {
    let setCode = listing.set_code ?? null;
    let cardNumber = listing.card_number ?? null;

    if ((!setCode || !cardNumber) && listing.card_id) {
      const parts = listing.card_id.split("-");
      if (parts.length >= 2) {
        setCode = setCode || parts[0];
        cardNumber = cardNumber || parts[parts.length - 1];
      }
    }

    if (setCode && cardNumber) {
      return `https://images.pokemontcg.io/${setCode}/${cardNumber}_hires.png`;
    }

    return null;
  };

  const getFirstImage = (listing: Listing): string | null => {
    const images = getListingImages(listing);

    if (images.length > 0) {
      const sortedImages = images.slice().sort((a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)
      );
      return sortedImages[0]?.image_url || null;
    }

    return getCardImageUrl(listing);
  };

  if (listings.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground font-normal">No listings yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const firstImage = getFirstImage(listing);
        
        return (
          <Card key={listing.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {firstImage ? (
                  <div className="aspect-[5/7] w-12 flex-shrink-0 bg-soft-neutral border border-divider-gray overflow-hidden">
                    <img 
                      src={firstImage} 
                      alt={listing.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[5/7] w-12 flex-shrink-0 bg-soft-neutral border border-divider-gray flex items-center justify-center text-[10px] text-muted-foreground">
                    No img
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-normal truncate tracking-tight">{listing.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="capitalize">{listing.status}</span>
                    <span>£{Number(listing.seller_price).toFixed(2)}</span>
                    {listing.created_at && (
                      <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/edit-listing/${listing.id}`)}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateListingUrl(
                    listing.id,
                    listing.title,
                    null
                  );
                  navigate(url);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this listing?")) {
                    onDelete(listing.id);
                  }
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
