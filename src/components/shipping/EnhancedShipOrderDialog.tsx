import { useState } from "react";
import { useShipping, ShippingRate } from "@/hooks/useShipping";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShippingRateSelector } from "./ShippingRateSelector";
import { Loader2, Package, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { formatCurrency } from "@/lib/format";

interface EnhancedShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export const EnhancedShipOrderDialog = ({
  open,
  onOpenChange,
  orderId,
}: EnhancedShipOrderDialogProps) => {
  const queryClient = useQueryClient();
  const { createLabel } = useShipping();
  const [selectedRate, setSelectedRate] = useState<ShippingRate | undefined>();

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            listing_id,
            listings(title, package_weight, package_dimensions)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleCreateLabel = async () => {
    if (!selectedRate) {
      toast.error('Please select a shipping method');
      return;
    }

    try {
      await createLabel.mutateAsync({
        orderId,
        carrierCode: selectedRate.carrierCode,
      });

      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      
      onOpenChange(false);
      
      // Open label in new tab if available
      const { data: parcel } = await supabase
        .from('sendcloud_parcels')
        .select('label_url')
        .eq('order_id', orderId)
        .single();
      
      if (parcel?.label_url) {
        window.open(parcel.label_url, '_blank');
      }
    } catch (error) {
      logger.error('Error creating label:', error);
    }
  };

  if (isLoading || !order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const shippingAddress = order.shipping_address as any;
  const totalWeight = order.order_items.reduce((sum: number, item: any) => {
    return sum + (item.listings?.package_weight || 100);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Shipping Label
          </DialogTitle>
          <DialogDescription>
            Select a shipping method and create a label for order {order.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Delivery Address</h4>
            <div className="text-sm text-muted-foreground">
              <div>{shippingAddress.name || shippingAddress.fullName}</div>
              <div>{shippingAddress.address || shippingAddress.street}</div>
              {shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
              <div>
                {shippingAddress.city}, {shippingAddress.postalCode || shippingAddress.zipCode}
              </div>
              <div>{shippingAddress.country}</div>
            </div>
          </div>

          {/* Package Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Package Details</h4>
            <div className="text-sm text-muted-foreground">
              <div>Weight: {(totalWeight / 1000).toFixed(2)} kg</div>
              <div>Items: {order.order_items.length}</div>
              <div>Value: {formatCurrency(Number(order.total_amount))}</div>
            </div>
          </div>

          <ShippingRateSelector
            toCountry={String(shippingAddress.country)}
            toPostalCode={String(shippingAddress.postalCode || shippingAddress.zipCode)}
            toCity={String(shippingAddress.city)}
            weight={totalWeight}
            declaredValue={Number(order.total_amount)}
            selectedRate={selectedRate}
            onRateSelected={setSelectedRate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCreateLabel}
              disabled={!selectedRate || createLabel.isPending}
              className="flex-1"
            >
              {createLabel.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Label...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Shipping Label
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createLabel.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};