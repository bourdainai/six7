import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface EnhancedReviewFormProps {
  orderId: string;
  listingId: string;
  sellerId: string;
  onSuccess?: () => void;
}

export const EnhancedReviewForm = ({
  orderId,
  listingId,
  sellerId,
  onSuccess,
}: EnhancedReviewFormProps) => {
  const { toast } = useToast();
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [packagingRating, setPackagingRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      // Upload images first
      const imageUrls: string[] = [];
      
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `review-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      // Submit review
      const { error } = await supabase
        .from('ratings')
        .insert({
          order_id: orderId,
          listing_id: listingId,
          reviewee_id: sellerId,
          reviewer_id: (await supabase.auth.getUser()).data.user!.id,
          rating: overallRating,
          communication_rating: communicationRating,
          packaging_rating: packagingRating,
          speed_rating: speedRating,
          review_text: reviewText,
          review_images: imageUrls.length > 0 ? imageUrls : null,
          review_type: 'seller',
          verified_purchase: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload up to 5 images",
        variant: "destructive",
      });
      return;
    }

    setImages([...images, ...files]);
    
    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const RatingRow = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    onChange: (rating: number) => void;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const canSubmit = overallRating > 0 && communicationRating > 0 && packagingRating > 0 && speedRating > 0;

  return (
    <div className="space-y-6">
      <RatingRow 
        label="Overall Experience" 
        value={overallRating} 
        onChange={setOverallRating} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RatingRow 
          label="Communication" 
          value={communicationRating} 
          onChange={setCommunicationRating} 
        />
        <RatingRow 
          label="Packaging Quality" 
          value={packagingRating} 
          onChange={setPackagingRating} 
        />
        <RatingRow 
          label="Shipping Speed" 
          value={speedRating} 
          onChange={setSpeedRating} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-text">Your Review (Optional)</Label>
        <Textarea
          id="review-text"
          placeholder="Share your experience with this seller..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <Label>Add Photos (Optional, max 5)</Label>
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="h-20 w-20 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Upload className="h-6 w-6 text-muted-foreground" />
            </label>
          )}
        </div>
      </div>

      <Button
        onClick={() => submitReviewMutation.mutate()}
        disabled={!canSubmit || submitReviewMutation.isPending}
        className="w-full"
      >
        {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
};