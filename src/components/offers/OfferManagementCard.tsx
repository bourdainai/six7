import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OfferExpirationTimer } from "./OfferExpirationTimer";
import { CounterOfferDialog } from "./CounterOfferDialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

interface OfferManagementCardProps {
  offer: OfferRow;
  userRole: 'buyer' | 'seller';
  onOfferUpdate?: () => void;
}

export const OfferManagementCard = ({ offer, userRole, onOfferUpdate }: OfferManagementCardProps) => {
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { currencySymbol } = useMarketplace();

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);

      if (error) throw error;

      // Record in history
      await supabase
        .from("offer_history")
        .insert({
          offer_id: offer.id,
          action: "accepted",
          actor_id: user.id,
          previous_amount: offer.amount,
          new_amount: offer.amount,
        });

      toast.success("Offer accepted");
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      onOfferUpdate?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to accept offer";
        logger.error("Error accepting offer:", error);
        toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("offers")
        .update({ status: "rejected" })
        .eq("id", offer.id);

      if (error) throw error;

      // Record in history
      await supabase
        .from("offer_history")
        .insert({
          offer_id: offer.id,
          action: "rejected",
          actor_id: user.id,
          previous_amount: offer.amount,
          new_amount: offer.amount,
        });

      toast.success("Offer rejected");
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      onOfferUpdate?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reject offer";
        logger.error("Error rejecting offer:", error);
        toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive",
      expired: "outline",
      countered: "secondary",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
  const canRespond = !isExpired && offer.status === 'pending' && userRole === 'seller';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {currencySymbol}{Number(offer.amount).toFixed(2)}
            </CardTitle>
            {getStatusBadge(offer.status)}
          </div>
          <CardDescription>
            {userRole === 'buyer' ? 'Your offer' : 'Offer from buyer'} • {format(new Date(offer.created_at), 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {offer.message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground italic">"{offer.message}"</p>
            </div>
          )}

          <OfferExpirationTimer expiresAt={offer.expires_at} />

          {offer.counter_offer_to && (
            <Badge variant="outline" className="w-fit">
              Counter Offer
            </Badge>
          )}

          {canRespond && (
            <div className="flex gap-2">
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1"
              >
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={() => setCounterDialogOpen(true)}
                disabled={isProcessing}
                className="flex-1"
              >
                Counter
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                Reject
              </Button>
            </div>
          )}

          {offer.status === 'accepted' && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">
                ✓ Offer accepted! Proceed to checkout.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CounterOfferDialog
        open={counterDialogOpen}
        onOpenChange={setCounterDialogOpen}
        originalOffer={offer}
        userRole={userRole}
      />
    </>
  );
};
