import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ImportSummaryProps {
  success: number;
  failed: number;
  onClose: () => void;
}

export function ImportSummary({ success, failed, onClose }: ImportSummaryProps) {
  const navigate = useNavigate();

  const handleViewDrafts = () => {
    onClose();
    // Navigate and switch to listings tab
    navigate("/seller-dashboard?tab=listings");
  };

  return (
    <div className="py-8 text-center space-y-6">
      <div className="flex justify-center">
        {failed === 0 ? (
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        ) : (
          <AlertCircle className="h-16 w-16 text-yellow-500" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Import Complete</h3>
        <div className="text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {success} cards imported successfully
          </p>
          {failed > 0 && (
            <p className="text-sm text-muted-foreground">
              {failed} cards skipped (missing critical data)
            </p>
          )}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 text-left">
        <p className="font-medium">Next steps:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>All cards are saved as draft listings</li>
          <li>Add photos to your listings</li>
          <li>Review prices and descriptions</li>
          <li>Publish when ready</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Done
        </Button>
        <Button onClick={handleViewDrafts} className="flex-1 gap-2">
          View Draft Listings
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
