import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string;
  reportedListingId?: string;
}

const REPORT_TYPES = [
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "counterfeit", label: "Counterfeit item" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "fraud", label: "Fraudulent activity" },
  { value: "other", label: "Other issue" },
];

export function ReportDialog({ open, onOpenChange, reportedUserId, reportedListingId }: ReportDialogProps) {
  const [reportType, setReportType] = useState<string>("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const createReport = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_listing_id: reportedListingId || null,
        report_type: reportType,
        reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      onOpenChange(false);
      setReportType("");
      setReason("");
    },
    onError: (error) => {
      toast.error("Failed to submit report: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!reportType || !reason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createReport.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report {reportedListingId ? "Listing" : "User"}
          </DialogTitle>
          <DialogDescription>
            Help us keep 6Seven safe by reporting violations of our policies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Details</Label>
            <Textarea
              id="reason"
              placeholder="Please provide details about the issue..."
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
          <Button onClick={handleSubmit} disabled={createReport.isPending}>
            {createReport.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
