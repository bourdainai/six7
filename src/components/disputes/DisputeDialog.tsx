import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  listingId: string;
  sellerId: string;
}

const DISPUTE_TYPES = [
  { value: "item_not_received", label: "Item not received" },
  { value: "item_not_as_described", label: "Item not as described" },
  { value: "damaged", label: "Item damaged" },
  { value: "counterfeit", label: "Suspected counterfeit" },
  { value: "other", label: "Other issue" },
];

export function DisputeDialog({ open, onOpenChange, orderId, listingId, sellerId }: DisputeDialogProps) {
  const [disputeType, setDisputeType] = useState<string>("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const createDispute = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("disputes").insert({
        order_id: orderId,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        dispute_type: disputeType,
        reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute opened successfully");
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      onOpenChange(false);
      setDisputeType("");
      setReason("");
    },
    onError: (error) => {
      toast.error("Failed to open dispute: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!disputeType || !reason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createDispute.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Open a Dispute
          </DialogTitle>
          <DialogDescription>
            If there's an issue with your order, open a dispute and we'll help resolve it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Issue Type</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Describe the Issue</Label>
            <Textarea
              id="reason"
              placeholder="Please provide details about what went wrong..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDispute.isPending}>
            {createDispute.isPending ? "Opening..." : "Open Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
