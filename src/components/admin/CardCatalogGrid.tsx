import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ImageOff,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { CardCatalogCard } from "@/hooks/useCardCatalog";
import { CardDetailModal } from "./CardDetailModal";

interface CardCatalogGridProps {
  cards: CardCatalogCard[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

// Helper function to get display name (always prefer English)
function getDisplayName(card: CardCatalogCard): string {
  return card.name_en || card.name || 'Unknown';
}

// Helper function to check if image is actually valid
function hasValidImage(card: CardCatalogCard): boolean {
  // For the admin catalog, treat the presence of an image URL as "has image".
  // Validation flags are noisy right now and should not hide potentially valid images.
  return !!(card.images?.small || card.images?.large);
}

function CardThumbnail({
  card,
  onClick,
}: {
  card: CardCatalogCard;
  onClick: () => void;
}) {
  const displayName = getDisplayName(card);
  const hasImage = hasValidImage(card);
  const hasPrice = card.tcgplayer_prices || card.cardmarket_prices;
  const imageUrl = card.images?.large || card.images?.small;

  return (
    <Card
      className={`group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
        !hasImage ? "border-red-500/50" : ""
      }`}
      onClick={onClick}
    >
      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-muted relative">
        {hasImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Image failed to load - hide it and show placeholder
              (e.target as HTMLImageElement).style.display = "none";
              const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (placeholder) placeholder.classList.remove("hidden");
            }}
          />
        ) : null}
        {/* Fallback for missing/broken images */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground ${
            hasImage ? "hidden" : ""
          }`}
        >
          <ImageOff className="h-8 w-8 mb-2 text-red-500" />
          <span className="text-xs text-center px-2">No Image</span>
        </div>

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {!hasImage && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              <ImageOff className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
          {!hasPrice && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-600"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              No Price
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-medium">View Details</span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-2 space-y-1">
        <h3 className="text-sm font-medium truncate" title={displayName}>
          {displayName}
        </h3>
        {!card.name_en && card.name && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(card.name) && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">Japanese Only</Badge>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{card.set_code}</span>
          <span>#{card.number}</span>
        </div>
        {card.rarity && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {card.rarity}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[2.5/3.5]" />
      <div className="p-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}

export function CardCatalogGrid({
  cards,
  isLoading,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: CardCatalogGridProps) {
  const [selectedCard, setSelectedCard] = useState<CardCatalogCard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCardClick = (card: CardCatalogCard) => {
    setSelectedCard(card);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {isLoading
          ? Array.from({ length: 24 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((card) => (
              <CardThumbnail
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
              />
            ))}
      </div>

      {/* Empty State */}
      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium">No cards found</h3>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {page * 50 + 1} - {Math.min((page + 1) * 50, totalCount)} of{" "}
            {totalCount.toLocaleString()} cards
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => onPageChange(0)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">
                Page {page + 1} of {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(totalPages - 1)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

