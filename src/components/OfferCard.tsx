import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Check, X, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OfferCardProps {
  offer: {
    id: string;
    amount: number;
    message: string | null;
    status: string;
    buyer_id: string;
    seller_id: string;
    listing_id: string;
    created_at: string;
  };
  userRole: 'buyer' | 'seller';
  userId: string;
  onOfferUpdate?: () => void;
}

export const OfferCard = ({ offer, userRole, userId, onOfferUpdate }: OfferCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAcceptOffer = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);

      if (error) throw error;

      // Send acceptance message
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", offer.listing_id)
        .eq("buyer_id", offer.buyer_id)
        .eq("seller_id", offer.seller_id)
        .single();

      if (conversation) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          sender_id: userId,
          content: `✅ Offer accepted! Buyer can now proceed to checkout at £${offer.amount}.`,
        });
      }

      toast({
        title: "Offer accepted!",
        description: "The buyer can now proceed to checkout",
      });

      onOfferUpdate?.();
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast({
        title: "Error",
        description: "Failed to accept offer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOffer = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("offers")
        .update({ status: "rejected" })
        .eq("id", offer.id);

      if (error) throw error;

      // Send rejection message
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", offer.listing_id)
        .eq("buyer_id", offer.buyer_id)
        .eq("seller_id", offer.seller_id)
        .single();

      if (conversation) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          sender_id: userId,
          content: `❌ Offer declined. Feel free to make a new offer.`,
        });
      }

      toast({
        title: "Offer rejected",
        description: "The buyer has been notified",
      });

      onOfferUpdate?.();
    } catch (error) {
      console.error("Error rejecting offer:", error);
      toast({
        title: "Error",
        description: "Failed to reject offer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    navigate(`/checkout/${offer.listing_id}?offer=${offer.id}`);
  };

  const getStatusBadge = () => {
    switch (offer.status) {
      case "accepted":
        return <Badge className="bg-green-500">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Offer: £{offer.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(offer.created_at).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {offer.message && (
            <p className="text-sm text-muted-foreground italic">
              "{offer.message}"
            </p>
          )}

          {/* Actions for seller on pending offers */}
          {offer.status === "pending" && userRole === "seller" && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleAcceptOffer}
                disabled={isProcessing}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectOffer}
                disabled={isProcessing}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {/* Checkout button for buyer on accepted offers */}
          {offer.status === "accepted" && userRole === "buyer" && (
            <Button
              size="sm"
              onClick={handleCheckout}
              className="w-full"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          )}

          {offer.status === "pending" && userRole === "buyer" && (
            <p className="text-xs text-muted-foreground">
              Waiting for seller to respond...
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
