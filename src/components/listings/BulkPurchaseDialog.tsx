import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { formatCondition } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Variant = Database["public"]["Tables"]["listing_variants"]["Row"];

interface BulkPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  variants: Variant[];
}

interface SelectedVariant {
  variant: Variant;
  quantity: number;
}

export const BulkPurchaseDialog = ({
  open,
  onOpenChange,
  listingId,
  variants,
}: BulkPurchaseDialogProps) => {
  const [selectedVariants, setSelectedVariants] = useState<Map<string, SelectedVariant>>(new Map());
  const { toast } = useToast();
  const navigate = useNavigate();

  const availableVariants = variants.filter(v => v.is_available && v.variant_quantity > 0);

  const handleToggleVariant = (variant: Variant) => {
    const newSelected = new Map(selectedVariants);
    if (newSelected.has(variant.id)) {
      newSelected.delete(variant.id);
    } else {
      newSelected.set(variant.id, { variant, quantity: 1 });
    }
    setSelectedVariants(newSelected);
  };

  const handleQuantityChange = (variantId: string, delta: number) => {
    const newSelected = new Map(selectedVariants);
    const selected = newSelected.get(variantId);
    if (!selected) return;

    const newQuantity = selected.quantity + delta;
    const maxQuantity = selected.variant.variant_quantity;

    if (newQuantity < 1 || newQuantity > maxQuantity) return;

    newSelected.set(variantId, { ...selected, quantity: newQuantity });
    setSelectedVariants(newSelected);
  };

  const calculateTotal = () => {
    let total = 0;
    selectedVariants.forEach((selected) => {
      total += Number(selected.variant.variant_price) * selected.quantity;
    });
    return total;
  };

  const handleCheckout = () => {
    if (selectedVariants.size === 0) {
      toast({
        title: "No variants selected",
        description: "Please select at least one variant",
        variant: "destructive",
      });
      return;
    }

    // For now, we'll navigate to checkout with the first variant
    // In a full implementation, you'd create a cart system
    const firstSelected = Array.from(selectedVariants.values())[0];
    const variantIds = Array.from(selectedVariants.keys()).join(",");
    
    // Store bulk purchase in session for checkout to retrieve
    sessionStorage.setItem("bulkPurchase", JSON.stringify({
      listingId,
      variants: Array.from(selectedVariants.entries()).map(([id, selected]) => ({
        variantId: id,
        quantity: selected.quantity,
        price: selected.variant.variant_price,
        name: selected.variant.variant_name,
      })),
    }));

    navigate(`/checkout/${listingId}?variant=${firstSelected.variant.id}&bulk=true`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buy Multiple Cards</DialogTitle>
          <DialogDescription>
            Select multiple variants to purchase together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableVariants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No variants available</p>
          ) : (
            availableVariants.map((variant) => {
              const isSelected = selectedVariants.has(variant.id);
              const selected = selectedVariants.get(variant.id);

              return (
                <div
                  key={variant.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleVariant(variant)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{variant.variant_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {formatCondition(variant.variant_condition)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {variant.variant_quantity} available
                            </span>
                          </div>
                        </div>
                        <span className="font-semibold text-lg">
                          £{Number(variant.variant_price).toFixed(2)}
                        </span>
                      </div>

                      {isSelected && selected && (
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-sm text-muted-foreground">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(variant.id, -1)}
                              disabled={selected.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{selected.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(variant.id, 1)}
                              disabled={selected.quantity >= variant.variant_quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm text-muted-foreground ml-auto">
                            Subtotal: £{(Number(variant.variant_price) * selected.quantity).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedVariants.size > 0 && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total ({selectedVariants.size} variants):</span>
              <span>£{calculateTotal().toFixed(2)}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full" size="lg">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Proceed to Checkout
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
