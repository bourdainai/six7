import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface DisputeFormProps {
  orderId: string;
  listingId: string;
  sellerId: string;
  onSuccess?: () => void;
}

export function DisputeForm({ orderId, listingId, sellerId, onSuccess }: DisputeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeType, setDisputeType] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");

  const createDispute = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");

      // Create dispute
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          order_id: orderId,
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          dispute_type: disputeType,
          reason,
          buyer_evidence: evidence ? { description: evidence } : null,
          status: "open",
        })
        .select()
        .single();

      if (disputeError) throw disputeError;

      // Trigger AI analysis
      try {
        await supabase.functions.invoke("dispute-auto-summarizer", {
          body: { dispute_id: dispute.id },
        });
      } catch (aiError) {
        logger.error("AI analysis failed:", aiError);
        // Don't fail the whole operation if AI fails
      }

      return dispute;
    },
    onSuccess: () => {
      toast({
        title: "Dispute submitted",
        description: "Your dispute has been submitted and is being reviewed by our team.",
      });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      setDisputeType("");
      setReason("");
      setEvidence("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit dispute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-900 dark:text-yellow-100">
            Before opening a dispute
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            Try contacting the seller first to resolve the issue. Disputes should be used as a last resort.
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Dispute Type</label>
        <Select value={disputeType} onValueChange={setDisputeType}>
          <SelectTrigger>
            <SelectValue placeholder="Select dispute type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item_not_received">Item Not Received</SelectItem>
            <SelectItem value="item_not_as_described">Item Not As Described</SelectItem>
            <SelectItem value="damaged_item">Damaged Item</SelectItem>
            <SelectItem value="counterfeit">Counterfeit Item</SelectItem>
            <SelectItem value="missing_parts">Missing Parts</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Reason for Dispute</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why you're opening this dispute..."
          rows={4}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Evidence / Details (Optional)</label>
        <Textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Provide any additional evidence or details to support your claim..."
          rows={4}
        />
      </div>

      <Button
        onClick={() => createDispute.mutate()}
        disabled={!disputeType || !reason || createDispute.isPending}
        className="w-full"
      >
        {createDispute.isPending ? "Submitting..." : "Submit Dispute"}
      </Button>
    </div>
  );
}
