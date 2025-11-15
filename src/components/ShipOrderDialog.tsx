import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export const ShipOrderDialog = ({ open, onOpenChange, orderId }: ShipOrderDialogProps) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shipOrderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("update-order-shipping", {
        body: { orderId, trackingNumber, carrier },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Order Shipped",
        description: "Shipping information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
      setTrackingNumber("");
      setCarrier("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update shipping",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !carrier) {
      toast({
        title: "Missing information",
        description: "Please provide both tracking number and carrier.",
        variant: "destructive",
      });
      return;
    }
    shipOrderMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ship Order</DialogTitle>
          <DialogDescription>
            Enter the tracking information for this order
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="carrier">Shipping Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger id="carrier">
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Royal Mail">Royal Mail</SelectItem>
                <SelectItem value="DPD">DPD</SelectItem>
                <SelectItem value="DHL">DHL</SelectItem>
                <SelectItem value="UPS">UPS</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="Hermes">Evri (Hermes)</SelectItem>
                <SelectItem value="Yodel">Yodel</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={shipOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={shipOrderMutation.isPending}>
              {shipOrderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Shipment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
