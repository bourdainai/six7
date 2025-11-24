import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SellerReviewResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  reviewerName: string;
}

export function SellerReviewResponseDialog({
  open,
  onOpenChange,
  reviewId,
  reviewerName,
}: SellerReviewResponseDialogProps) {
  const [response, setResponse] = useState("");
  const queryClient = useQueryClient();

  const submitResponse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ratings")
        .update({
          seller_response: response,
          seller_response_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response posted successfully");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      onOpenChange(false);
      setResponse("");
    },
    onError: (error) => {
      toast.error("Failed to post response: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Respond to Review</DialogTitle>
          <DialogDescription>
            Reply to {reviewerName}'s review to address their feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="response">Your Response</Label>
            <Textarea
              id="response"
              placeholder="Thank you for your feedback..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Be professional, address specific concerns, and show that you value customer feedback.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submitResponse.mutate()}
            disabled={!response.trim() || submitResponse.isPending}
          >
            {submitResponse.isPending ? "Posting..." : "Post Response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
