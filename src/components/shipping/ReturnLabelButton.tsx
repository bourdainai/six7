import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { logger } from "@/lib/logger";

interface ReturnLabelButtonProps {
  orderId: string;
  onSuccess?: () => void;
}

export const ReturnLabelButton = ({ orderId, onSuccess }: ReturnLabelButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateReturnLabel = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('sendcloud-return-label', {
        body: {
          orderId,
          reason: reason.trim(),
        },
      });

      if (error) throw error;

      toast.success('Return label created successfully');
      
      // Download label
      if (data.labelUrl) {
        window.open(data.labelUrl, '_blank');
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Return label error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create return label');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Request Return
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Return Label</DialogTitle>
            <DialogDescription>
              Generate a prepaid return shipping label for this order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Return
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe why you're returning this item..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateReturnLabel}
                disabled={isCreating || !reason.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Label...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Create Return Label
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
