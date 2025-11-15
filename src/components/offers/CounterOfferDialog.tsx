import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CounterOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalOffer: any;
  userRole: 'buyer' | 'seller';
}

export const CounterOfferDialog = ({ open, onOpenChange, originalOffer, userRole }: CounterOfferDialogProps) => {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create counter offer
      const { error: offerError } = await supabase
        .from("offers")
        .insert({
          conversation_id: originalOffer.conversation_id,
          listing_id: originalOffer.listing_id,
          buyer_id: originalOffer.buyer_id,
          seller_id: originalOffer.seller_id,
          amount: Number(amount),
          message: message,
          status: "pending",
          counter_offer_to: originalOffer.id,
        });

      if (offerError) throw offerError;

      // Update original offer status
      const { error: updateError } = await supabase
        .from("offers")
        .update({ status: "countered" })
        .eq("id", originalOffer.id);

      if (updateError) throw updateError;

      // Record in history
      const { error: historyError } = await supabase
        .from("offer_history")
        .insert({
          offer_id: originalOffer.id,
          action: "countered",
          actor_id: user.id,
          previous_amount: originalOffer.amount,
          new_amount: Number(amount),
          notes: message,
        });

      if (historyError) throw historyError;

      toast.success("Counter offer sent");
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      onOpenChange(false);
      setAmount("");
      setMessage("");
    } catch (error: any) {
      console.error("Error creating counter offer:", error);
      toast.error(error.message || "Failed to send counter offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make Counter Offer</DialogTitle>
          <DialogDescription>
            Original offer: £{Number(originalOffer?.amount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Your Counter Offer (£)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your counter offer..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Counter Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
