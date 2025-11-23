import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ShippingLabelViewerProps {
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
}

export const ShippingLabelViewer = ({
  labelUrl,
  trackingNumber,
  carrier,
}: ShippingLabelViewerProps) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownload = () => {
    window.open(labelUrl, '_blank');
    toast.success('Opening label in new tab');
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const printWindow = window.open(labelUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('Opening print dialog');
    } catch (error) {
      toast.error('Failed to open print dialog');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">Shipping Label</h3>
          <p className="text-sm text-muted-foreground">
            {carrier} - {trackingNumber}
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden bg-muted">
          <iframe
            src={labelUrl}
            className="w-full h-96"
            title="Shipping Label"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            variant="outline"
            className="flex-1"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={() => window.open(labelUrl, '_blank')}
            variant="outline"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};