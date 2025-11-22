import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCondition, formatStatus } from "@/lib/format";
import { SellerReputation } from "@/components/seller/SellerReputation";
import type { ListingImageSummary, ListingSummary } from "@/types/listings";
import { generateListingUrl } from "@/lib/listing-url";

interface ListingCardProps {
  listing: ListingSummary;
  onSaveClick?: (listingId: string) => void;
  isSaved?: boolean;
  isSaving?: boolean;
  showSaveButton?: boolean;
  className?: string;
}

const getListingImages = (listing: ListingSummary): ListingImageSummary[] => {
  if (Array.isArray(listing.images)) {
    return listing.images;
  }
  if (Array.isArray(listing.listing_images)) {
    return listing.listing_images;
  }
  return [];
};

const getFirstImage = (listing: ListingSummary): string | null => {
  const listingImages = getListingImages(listing);
  const firstImage = listingImages
    .slice()
    .sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0),
    )[0];
  
  return firstImage?.image_url || null;
};

// Update ListingCard to be more flexible
export const ListingCard = React.memo(
  ({ listing, onSaveClick, isSaved = false, isSaving = false, showSaveButton = true, className = "" }: ListingCardProps) => {
    const navigate = useNavigate();
    
    const listingUrl = generateListingUrl(
      listing.id,
      listing.title,
      listing.seller?.full_name
    );
    
    const firstImage = getFirstImage(listing);
    const isCardListing = listing.category === "Trading Cards" || 
                          listing.category?.includes("Card") || 
                          listing.category?.includes("Pokémon");

  return (
    <div className={`group relative ${className}`}>
      <button
        onClick={() => navigate(listingUrl)}
        className="text-left w-full"
      >
        {/* Use different aspect ratio for non-card items */}
        <div className={`${isCardListing ? 'aspect-[5/7]' : 'aspect-square'} bg-soft-neutral overflow-hidden mb-3 relative border border-divider-gray group-hover:border-foreground transition-all duration-fast`}>
          {firstImage ? (
            <img
              src={firstImage}
              alt={listing.title}
              className="w-full h-full object-contain group-hover:opacity-95 transition-opacity duration-fast"
              loading="lazy"
              decoding="async"
              width="400"
              height={isCardListing ? "560" : "400"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
            {listing.status && listing.status !== "active" && (
            <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                {formatStatus(listing.status)}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-normal text-foreground line-clamp-1 group-hover:opacity-70 transition-opacity duration-fast tracking-tight">
            {listing.title}
          </h3>
          
          <div className="flex items-center gap-2">
            {listing.brand && (
              <p className="text-sm text-muted-foreground font-normal">
                {listing.brand}
              </p>
            )}
            {listing.condition && (
              <Badge variant="secondary" className="text-xs">
                {formatCondition(listing.condition)}
              </Badge>
            )}
          </div>

            <div className="flex items-baseline gap-2">
            <p className="text-base font-normal text-foreground tracking-tight">
                £{Number(listing.seller_price).toFixed(2)}
            </p>
            {listing.original_rrp && (
              <p className="text-xs text-muted-foreground line-through font-normal">
                £{Number(listing.original_rrp).toFixed(2)}
              </p>
            )}
          </div>

          {listing.size && (
            <p className="text-xs text-muted-foreground font-normal">Size: {listing.size}</p>
          )}

          {listing.seller?.id && (
            <div className="pt-1">
              <SellerReputation sellerId={listing.seller.id} compact />
            </div>
          )}
        </div>
      </button>

      {/* Save Action */}
        {showSaveButton && onSaveClick && (
        <div className="mt-3 flex items-center justify-end gap-2 px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSaveClick(listing.id);
            }}
            disabled={isSaving}
            className={isSaved ? "text-destructive hover:text-destructive/80" : ""}
          >
            <Heart 
              className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} 
            />
          </Button>
        </div>
      )}
    </div>
  );
  },
);

