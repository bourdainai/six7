import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { Loader2 } from "lucide-react";

export function TradeOfferModal({ open, onOpenChange, listingId }: any) {
  const [cashAmount, setCashAmount] = useState("");
  const { createOffer } = useTradeOffers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createOffer.mutateAsync({
        targetListingId: listingId,
        cashAmount: Number(cashAmount),
        tradeItems: [], // Mock empty items for now
        photos: []
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Trade Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cash Amount (£)</Label>
            <Input value={cashAmount} onChange={e => setCashAmount(e.target.value)} type="number" />
          </div>
          {/* Inventory Selector Placeholder */}
          <div className="p-4 border border-dashed rounded text-center text-muted-foreground">
            Select items from your inventory (Coming Soon)
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

