import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCondition, formatStatus } from "@/lib/format";
import { SellerReputation } from "@/components/seller/SellerReputation";

interface ListingImage {
  image_url: string;
  display_order: number;
}

interface ListingSeller {
  id: string;
  full_name?: string;
  trust_score?: number;
}

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    brand?: string;
    size?: string;
    color?: string;
    condition?: string;
    seller_price: number;
    original_rrp?: number;
    status?: string;
    images?: ListingImage[];
    seller?: ListingSeller;
  };
  onSaveClick?: (listingId: string) => void;
  isSaved?: boolean;
  isSaving?: boolean;
  showSaveButton?: boolean;
  className?: string;
}

export const ListingCard = React.memo(({
  listing,
  onSaveClick,
  isSaved = false,
  isSaving = false,
  showSaveButton = true,
  className = "",
}: ListingCardProps) => {
  const navigate = useNavigate();

  const firstImage = listing.images?.sort(
    (a, b) => a.display_order - b.display_order
  )[0];

  return (
    <div className={`group relative ${className}`}>
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
          {listing.status && listing.status !== "active" && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                {formatStatus(listing.status)}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          
          <div className="flex items-center gap-2">
            {listing.brand && (
              <p className="text-sm text-muted-foreground">
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
            className={isSaved ? "text-red-500 hover:text-red-600" : ""}
          >
            <Heart 
              className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} 
            />
          </Button>
        </div>
      )}
    </div>
  );
});

