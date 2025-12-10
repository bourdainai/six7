import { useCallback } from "react";
import { Loader2, Eye, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useHaptics } from "@/hooks/useHaptics";
import type { SellWizardState } from "@/hooks/useSellWizard";

interface PublishStepProps {
  wizard: SellWizardState;
  onPublish: () => void;
}

export function PublishStep({ wizard, onPublish }: PublishStepProps) {
  const haptics = useHaptics();
  const { draft, isPublishing, goToStep } = wizard;

  const handleEditStep = useCallback((step: "capture" | "details" | "shipping") => {
    haptics.light();
    goToStep(step);
  }, [goToStep, haptics]);

  // Generate title
  const title = draft.card
    ? `${draft.card.name} - ${draft.card.setName} ${draft.card.cardNumber}`
    : "Pokemon Card";

  // Get condition label
  const conditionLabels: Record<string, string> = {
    mint: "Mint",
    near_mint: "Near Mint",
    excellent: "Excellent",
    good: "Good",
    played: "Played",
    damaged: "Damaged",
  };

  const conditionLabel = draft.condition ? conditionLabels[draft.condition] || draft.condition : "";

  // Calculate fees (simplified - actual fees come from calculate-fees function)
  const itemPrice = Number(draft.price) || 0;
  const shippingPrice = draft.freeShipping ? 0 : draft.shippingCost;
  const buyerFee = Math.max(0.40 + itemPrice * 0.01, 0.40); // 40p + 1%
  const totalBuyerPays = itemPrice + shippingPrice + buyerFee;

  // Seller receives (simplified estimate)
  const sellerFee = itemPrice * 0.05; // ~5% seller fee
  const sellerReceives = itemPrice - sellerFee + (draft.freeShipping ? 0 : shippingPrice);

  return (
    <div className="p-4 space-y-6 pb-32">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Preview your listing</h2>
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" />
          Buyer view
        </Badge>
      </div>

      {/* Listing Preview Card */}
      <Card className="overflow-hidden">
        {/* Image */}
        <div className="aspect-square bg-muted relative">
          {draft.images.length > 0 ? (
            <img
              src={draft.images[0]}
              alt={title}
              className="w-full h-full object-contain"
            />
          ) : draft.card?.imageUrl ? (
            <img
              src={draft.card.imageUrl}
              alt={title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}

          {/* Image count badge */}
          {draft.images.length > 1 && (
            <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
              1/{draft.images.length}
            </span>
          )}
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2">{title}</h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {conditionLabel && (
              <Badge variant="outline">{conditionLabel}</Badge>
            )}
            {draft.isGraded && draft.gradingService && draft.gradingScore && (
              <Badge variant="secondary">
                {draft.gradingService} {draft.gradingScore}
              </Badge>
            )}
            {draft.card?.rarity && (
              <Badge variant="outline" className="text-purple-600">
                {draft.card.rarity}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">£{itemPrice.toFixed(2)}</span>
            {draft.acceptsOffers && (
              <span className="text-sm text-muted-foreground">or make offer</span>
            )}
          </div>

          {/* Shipping */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            {draft.freeShipping ? (
              <span className="text-green-600 font-medium">Free shipping</span>
            ) : (
              <span>+ £{shippingPrice.toFixed(2)} shipping</span>
            )}
          </div>

          {/* Description preview */}
          {draft.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {draft.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Edit Links */}
      <div className="flex gap-4 text-sm">
        <button
          onClick={() => handleEditStep("capture")}
          className="text-primary hover:underline"
        >
          Edit photos
        </button>
        <button
          onClick={() => handleEditStep("details")}
          className="text-primary hover:underline"
        >
          Edit details
        </button>
        <button
          onClick={() => handleEditStep("shipping")}
          className="text-primary hover:underline"
        >
          Edit shipping
        </button>
      </div>

      <Separator />

      {/* Fee Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Price breakdown</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item price</span>
            <span>£{itemPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{draft.freeShipping ? "Free" : `£${shippingPrice.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buyer fee</span>
            <span>£{buyerFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Buyer pays</span>
            <span>£{totalBuyerPays.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">You receive</span>
            <span className="font-medium">£{sellerReceives.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Final fees calculated at sale. <a href="/pricing" className="underline">Fee details</a>
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {[
          { label: "Photos added", done: draft.images.length > 0 || !!draft.card?.imageUrl },
          { label: "Condition set", done: !!draft.condition },
          { label: "Price set", done: !!draft.price && Number(draft.price) > 0 },
        ].filter(item => !item.done).length > 0 && (
          <>
            <h3 className="text-sm font-medium">Before you publish</h3>
            {[
              { label: "Photos added", done: draft.images.length > 0 || !!draft.card?.imageUrl },
              { label: "Condition set", done: !!draft.condition },
              { label: "Price set", done: !!draft.price && Number(draft.price) > 0 },
            ].filter(item => !item.done).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-current" />
                <span>{item.label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Fixed Publish Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t safe-area-inset-bottom">
        <Button
          className="w-full h-14 text-lg font-semibold"
          onClick={onPublish}
          disabled={isPublishing || !draft.condition || !draft.price}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Listing"
          )}
        </Button>
      </div>
    </div>
  );
}
