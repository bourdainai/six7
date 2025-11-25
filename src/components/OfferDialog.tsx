import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { BadgeDollarSign } from "lucide-react";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { logger } from "@/lib/logger";

interface OfferDialogProps {
  listingId: string;
  listingPrice: number;
  sellerId: string;
  variantId?: string | null;
  variantName?: string;
  onOfferCreated?: () => void;
}

export const OfferDialog = ({
  listingId,
  listingPrice,
  sellerId,
  variantId,
  variantName,
  onOfferCreated,
}: OfferDialogProps) => {
  const [open, setOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(listingPrice * 0.9);
  const [offerMessage, setOfferMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currencySymbol } = useMarketplace();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to make an offer",
        variant: "destructive",
      });
      return;
    }

    if (user.id === sellerId) {
      toast({
        title: "Not allowed",
        description: "You cannot make an offer on your own listing",
        variant: "destructive",
      });
      return;
    }

    if (offerAmount <= 0 || offerAmount >= listingPrice) {
      toast({
        title: "Invalid offer",
        description: "Offer must be greater than 0 and less than the asking price",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create or get conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .single();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: sellerId,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create offer with variant metadata if applicable
      const offerData: any = {
        conversation_id: conversationId,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        amount: offerAmount,
        message: offerMessage,
        status: "pending",
      };

      // Store variant info in metadata if provided
      if (variantId) {
        offerData.metadata = {
          variant_id: variantId,
          variant_name: variantName,
        };
      }

      const { error: offerError } = await supabase.from("offers").insert(offerData);

      if (offerError) throw offerError;

      // Send notification message with variant info
      const messageContent = variantName
        ? `📦 Made an offer of ${currencySymbol}${offerAmount} for ${variantName}${offerMessage ? `\n\n"${offerMessage}"` : ""}`
        : `📦 Made an offer of ${currencySymbol}${offerAmount}${offerMessage ? `\n\n"${offerMessage}"` : ""}`;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
      });

      toast({
        title: "Offer sent!",
        description: "The seller will be notified of your offer",
      });

      setOpen(false);
      setOfferAmount(listingPrice * 0.9);
      setOfferMessage("");
      onOfferCreated?.();
    } catch (error) {
      logger.error("Error creating offer:", error);
      toast({
        title: "Error",
        description: "Failed to create offer",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-12 text-base font-medium" size="lg">
          <BadgeDollarSign className="mr-2 h-5 w-5" />
          Make Offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
          <DialogDescription>
            {variantName && <span className="block font-medium mb-1">For: {variantName}</span>}
            The seller is asking {currencySymbol}{listingPrice}. Make a reasonable offer below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="offer-amount">Your Offer ({currencySymbol})</Label>
            <Input
              id="offer-amount"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(Number(e.target.value))}
              min="1"
              max={listingPrice - 1}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(((listingPrice - offerAmount) / listingPrice) * 100)}% off asking price
            </p>
          </div>

          <div>
            <Label htmlFor="offer-message">Message (Optional)</Label>
            <Textarea
              id="offer-message"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Add a message to your offer..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Sending..." : "Send Offer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
