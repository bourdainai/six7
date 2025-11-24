import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  rating: number;
  communication_rating?: number;
  packaging_rating?: number;
  speed_rating?: number;
  review_text?: string;
  review_images?: string[];
  seller_response?: string;
  seller_response_at?: string;
  helpful_count?: number;
  reviewer_id: string;
  reviewee_id: string;
  created_at: string;
}

interface EnhancedReviewDisplayProps {
  review: Review;
  isSeller?: boolean;
}

export const EnhancedReviewDisplay = ({ review, isSeller }: EnhancedReviewDisplayProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [response, setResponse] = useState("");

  const helpfulMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('review_votes')
        .insert({
          review_id: review.id,
          user_id: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast({ title: "Thanks for your feedback!" });
    },
    onError: () => {
      toast({
        title: "Already voted",
        description: "You've already marked this review as helpful",
        variant: "destructive",
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ratings')
        .update({
          seller_response: response,
          seller_response_at: new Date().toISOString(),
        })
        .eq('id', review.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowResponseForm(false);
      setResponse("");
      toast({ title: "Response posted!" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post response",
        variant: "destructive",
      });
    },
  });

  const StarRating = ({ rating, label }: { rating: number; label?: string }) => (
    <div className="flex items-center gap-1">
      {label && <span className="text-xs text-muted-foreground mr-1">{label}:</span>}
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <StarRating rating={review.rating} />
          <div className="flex flex-wrap gap-3 text-xs">
            {review.communication_rating && (
              <StarRating rating={review.communication_rating} label="Communication" />
            )}
            {review.packaging_rating && (
              <StarRating rating={review.packaging_rating} label="Packaging" />
            )}
            {review.speed_rating && (
              <StarRating rating={review.speed_rating} label="Speed" />
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
        </span>
      </div>

      {review.review_text && (
        <p className="text-sm text-foreground">{review.review_text}</p>
      )}

      {review.review_images && review.review_images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {(review.review_images as string[]).map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Review ${index + 1}`}
              className="h-24 w-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(image, '_blank')}
            />
          ))}
        </div>
      )}

      {review.seller_response && (
        <div className="bg-muted p-3 rounded-md space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>Seller Response</span>
            {review.seller_response_at && (
              <span>• {formatDistanceToNow(new Date(review.seller_response_at), { addSuffix: true })}</span>
            )}
          </div>
          <p className="text-sm">{review.seller_response}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => helpfulMutation.mutate()}
          disabled={!user || helpfulMutation.isPending}
          className="gap-1"
        >
          <ThumbsUp className="h-4 w-4" />
          Helpful ({review.helpful_count || 0})
        </Button>

        {isSeller && !review.seller_response && user?.id === review.reviewee_id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResponseForm(!showResponseForm)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Respond
          </Button>
        )}
      </div>

      {showResponseForm && (
        <div className="space-y-3 pt-2">
          <Textarea
            placeholder="Write your response to this review..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => respondMutation.mutate()}
              disabled={!response.trim() || respondMutation.isPending}
              size="sm"
            >
              {respondMutation.isPending ? "Posting..." : "Post Response"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResponseForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};