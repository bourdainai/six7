import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  ChevronUp, 
  Save, 
  X, 
  PackageX, 
  PackageCheck,
  AlertCircle 
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface VariantManagerProps {
  listingId: string;
  listingTitle: string;
}

type Variant = Database["public"]["Tables"]["listing_variants"]["Row"];

export const VariantManager = ({ listingId, listingTitle }: VariantManagerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editQuantity, setEditQuantity] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch variants
  const { data: variants, isLoading } = useQuery({
    queryKey: ["listing-variants", listingId],
    enabled: isExpanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_variants")
        .select("*")
        .eq("listing_id", listingId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Variant[];
    },
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: async ({ 
      variantId, 
      updates 
    }: { 
      variantId: string; 
      updates: Partial<Variant> 
    }) => {
      const { error } = await supabase
        .from("listing_variants")
        .update(updates)
        .eq("id", variantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-variants", listingId] });
      toast({ title: "Updated", description: "Variant updated successfully" });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update variant", variant: "destructive" });
    },
  });

  const handleStartEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditPrice(variant.variant_price.toString());
    setEditQuantity(variant.variant_quantity.toString());
  };

  const handleSaveEdit = (variantId: string) => {
    const price = parseFloat(editPrice);
    const quantity = parseInt(editQuantity);

    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid Price", description: "Price must be greater than 0", variant: "destructive" });
      return;
    }
    if (isNaN(quantity) || quantity < 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be 0 or greater", variant: "destructive" });
      return;
    }

    updateVariantMutation.mutate({
      variantId,
      updates: {
        variant_price: price,
        variant_quantity: quantity,
        is_available: quantity > 0,
      },
    });
  };

  const handleToggleAvailability = (variant: Variant) => {
    updateVariantMutation.mutate({
      variantId: variant.id,
      updates: { is_available: !variant.is_available },
    });
  };

  const getStockBadge = (variant: Variant) => {
    if (!variant.is_available) {
      return <Badge variant="destructive" className="gap-1"><PackageX className="h-3 w-3" />Sold Out</Badge>;
    }
    if (variant.variant_quantity === 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Out of Stock</Badge>;
    }
    if (variant.variant_quantity <= 2) {
      return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock ({variant.variant_quantity})</Badge>;
    }
    return <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200"><PackageCheck className="h-3 w-3" />{variant.variant_quantity} in stock</Badge>;
  };

  const totalVariants = variants?.length || 0;
  const activeVariants = variants?.filter(v => v.is_available).length || 0;

  return (
    <div className="mt-2 border-t border-divider-gray pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-sm">
            {totalVariants} Variants ({activeVariants} active)
          </span>
        </span>
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading variants...</p>
          ) : variants && variants.length > 0 ? (
            variants.map((variant) => {
              const isEditing = editingId === variant.id;

              return (
                <Card key={variant.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Name & Condition */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{variant.variant_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{variant.variant_condition?.replace('_', ' ')}</p>
                    </div>

                    {/* Middle: Price & Quantity */}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">Qty:</span>
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">£{variant.variant_price.toFixed(2)}</span>
                        {getStockBadge(variant)}
                      </div>
                    )}

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveEdit(variant.id)}
                            disabled={updateVariantMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(variant)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={variant.is_available ? "outline" : "default"}
                            onClick={() => handleToggleAvailability(variant)}
                            disabled={updateVariantMutation.isPending}
                          >
                            {variant.is_available ? "Mark Sold" : "Mark Available"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No variants found</p>
          )}
        </div>
      )}
    </div>
  );
};
