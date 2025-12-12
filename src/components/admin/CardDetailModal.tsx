import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Image,
  Database,
  DollarSign,
  Clock,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { CardCatalogCard } from "@/hooks/useCardCatalog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getCardDisplayName, hasOnlyJapaneseName, getSetDisplayName } from "@/utils/cardDisplayName";

interface CardDetailModalProps {
  card: CardCatalogCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DataField({ label, value, copyable = false }: { label: string; value: any; copyable?: boolean }) {
  const { toast } = useToast();
  const displayValue = value === null || value === undefined ? "—" : String(value);
  const isEmpty = value === null || value === undefined;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    toast({ description: "Copied to clipboard" });
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-muted-foreground min-w-[140px]">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className={`text-sm text-right ${isEmpty ? "text-muted-foreground/50 italic" : ""}`}>
          {displayValue}
        </span>
        {copyable && !isEmpty && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function JsonField({ label, value }: { label: string; value: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasData = value !== null && value !== undefined && Object.keys(value).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between py-2 border-b border-border/50 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-center gap-2">
            {hasData ? (
              <Badge variant="secondary" className="text-xs">
                {Object.keys(value).length} fields
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground/50 italic">Empty</span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {hasData && (
          <pre className="text-xs bg-muted/50 p-3 rounded-md mt-2 overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Helper function to check if image is actually usable in the UI
function hasValidImage(card: CardCatalogCard): boolean {
  // For now we rely purely on the presence of an image URL.
  // The image_validated flag is informational and should not block display.
  return !!(card.images?.small || card.images?.large);
}

export function CardDetailModal({ card, open, onOpenChange }: CardDetailModalProps) {
  if (!card) return null;

  const displayName = getCardDisplayName(card);
  const showJapaneseOnlyBadge = hasOnlyJapaneseName(card);
  const hasImage = hasValidImage(card);
  const hasPrice = card.tcgplayer_prices || card.cardmarket_prices;
  const imageUrl = card.images?.large || card.images?.small;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <span>{displayName}</span>
            {showJapaneseOnlyBadge && (
              <Badge variant="secondary" className="text-xs">Japanese Only</Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {card.set_code}-{card.number}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Image and Status */}
              <div className="space-y-4">
                {/* Card Image */}
                <div className="relative aspect-[2.5/3.5] bg-muted rounded-lg overflow-hidden border">
                  {hasImage && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Image failed to load - mark as invalid
                        (e.target as HTMLImageElement).style.display = "none";
                        const errorDiv = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (errorDiv) errorDiv.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* Fallback for missing/broken images */}
                  {(!hasImage || !imageUrl) && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mb-2 text-destructive" />
                      <span className="text-sm font-medium">No Image</span>
                    </div>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${hasImage ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <div className="flex items-center gap-2">
                      <Image className={`h-4 w-4 ${hasImage ? "text-green-500" : "text-red-500"}`} />
                      <span className="text-sm font-medium">
                        {hasImage ? "Has Image" : "Missing Image"}
                      </span>
                      {('image_validated' in card) && card.image_validated === false && (
                        <Badge variant="destructive" className="text-xs ml-1">Invalid URL</Badge>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg border ${hasPrice ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}>
                    <div className="flex items-center gap-2">
                      <DollarSign className={`h-4 w-4 ${hasPrice ? "text-green-500" : "text-yellow-500"}`} />
                      <span className="text-sm font-medium">
                        {hasPrice ? "Has Prices" : "No Prices"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Database Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4" />
                    <span>Database Info</span>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground font-mono">
                    <p>Table: <span className="text-foreground">pokemon_card_attributes</span></p>
                    <p>ID: <span className="text-foreground">{card.id}</span></p>
                    <p>card_id: <span className="text-foreground">{card.card_id}</span></p>
                  </div>
                </div>
              </div>

              {/* Right Column - All Data Fields */}
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Basic Information
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <DataField label="card_id" value={card.card_id} copyable />
                    <DataField label="name (Japanese)" value={card.name} />
                    <DataField label="name_en (English)" value={card.name_en || "— Not available"} />
                    {!card.name_en && card.name && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(card.name) && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-700 dark:text-yellow-400">
                        ⚠️ English name missing - will display Japanese name
                      </div>
                    )}
                    <DataField label="set_code" value={card.set_code} />
                    <DataField label="set_name" value={card.set_name} />
                    <DataField label="number" value={card.number} />
                    <DataField label="display_number" value={card.display_number} />
                    <DataField label="rarity" value={card.rarity} />
                    <DataField label="artist" value={card.artist} />
                    <DataField label="supertype" value={card.supertype} />
                    <DataField label="printed_total" value={card.printed_total} />
                  </div>
                </div>

                {/* Arrays */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Types & Subtypes</h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <DataField label="types" value={card.types?.join(", ")} />
                    <DataField label="subtypes" value={card.subtypes?.join(", ")} />
                  </div>
                </div>

                {/* Sync Info */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Sync Information
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <DataField label="sync_source" value={card.sync_source} />
                    <DataField label="synced_at" value={card.synced_at ? new Date(card.synced_at).toLocaleString() : null} />
                    <DataField label="last_price_update" value={card.last_price_update ? new Date(card.last_price_update).toLocaleString() : null} />
                    <DataField label="created_at" value={new Date(card.created_at).toLocaleString()} />
                  </div>
                </div>

                {/* Market Links */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Market Links
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <DataField label="tcgplayer_id" value={card.tcgplayer_id} copyable />
                    <DataField label="cardmarket_id" value={card.cardmarket_id} copyable />
                  </div>
                </div>

                {/* JSON Fields */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">JSON Data</h3>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <JsonField label="images" value={card.images} />
                    <JsonField label="tcgplayer_prices" value={card.tcgplayer_prices} />
                    <JsonField label="cardmarket_prices" value={card.cardmarket_prices} />
                    <JsonField label="metadata" value={card.metadata} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

