import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { Loader2 } from "lucide-react";

export function TradeOfferModal({ open, onOpenChange, listingId }: any) {
  const [cashAmount, setCashAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { createOffer } = useTradeOffers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const amount = cashAmount ? Number(cashAmount) : 0;
      const photos = imageUrl ? [imageUrl] : [];
      await createOffer.mutateAsync({
        targetListingId: listingId,
        cashAmount: amount,
        tradeItems: [], // For now we only support cash + optional photos
        photos
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
          <div>
            <Label className="mb-1 block text-sm">Card Photo URL (optional)</Label>
            <Input 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)} 
              type="url" 
              placeholder="Paste a link to a photo of your card"
            />
            <p className="text-xs text-muted-foreground mt-1">
              In the next version we’ll support direct uploads. For now, you can paste an image URL.
            </p>
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

