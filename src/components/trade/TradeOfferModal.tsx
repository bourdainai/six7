import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface TradeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  variantId?: string | null;
  variantName?: string;
}

export function TradeOfferModal({ open, onOpenChange, listingId, variantId, variantName }: TradeOfferModalProps) {
  const [cashAmount, setCashAmount] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const { createOffer } = useTradeOffers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);

    // Generate local previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(previews);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const amount = cashAmount ? Number(cashAmount) : 0;

      // Upload photos to Supabase Storage (listing-images bucket)
      const uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("You must be signed in to upload photos.");
        }

        for (const file of selectedFiles) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/trades/${crypto.randomUUID()}.${ext}`;

          const { data, error } = await supabase.storage
            .from("listing-images")
            .upload(path, file);

          if (error || !data) {
            throw error || new Error("Failed to upload photo");
          }

          const { data: publicData } = supabase.storage
            .from("listing-images")
            .getPublicUrl(data.path);

          if (publicData?.publicUrl) {
            uploadedUrls.push(publicData.publicUrl);
          }
        }
      }

      const offerData: any = {
        target_listing_id: listingId,
        cash_amount: amount,
        trade_items: [],
        photos: uploadedUrls,
      };

      // Include variant info in metadata if provided
      if (variantId) {
        offerData.metadata = {
          variant_id: variantId,
          variant_name: variantName,
        };
      }

      await createOffer.mutateAsync(offerData);

      // Clean up previews and close
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (e) {
      logger.error('Trade offer creation error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Trade Offer</DialogTitle>
          {variantName && (
            <p className="text-sm text-muted-foreground">For: {variantName}</p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cash Amount (£)</Label>
            <Input
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              type="number"
              min="0"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <Label className="mb-1 block text-sm">Add photos of your card (optional)</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleFilesChange}
            />
            <p className="text-xs text-muted-foreground">
              You can select multiple photos from your device. On mobile, you can also use your camera.
            </p>
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-md overflow-hidden border border-divider-gray"
                  >
                    <img src={url} alt={`Selected ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

