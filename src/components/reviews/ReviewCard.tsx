import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { SellerReviewResponseDialog } from "./SellerReviewResponseDialog";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    communication_rating: number | null;
    packaging_rating: number | null;
    speed_rating: number | null;
    review_text: string | null;
    created_at: string;
    helpful_count: number;
    review_images: string[];
    verified_purchase: boolean;
    seller_response: string | null;
    seller_response_at: string | null;
    reviewer: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    };
    reviewee: {
      id: string;
      full_name: string | null;
    };
  };
  userVoted?: boolean;
  isSellerView?: boolean;
}

export function ReviewCard({ review, userVoted = false, isSellerView = false }: ReviewCardProps) {
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(userVoted);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const isSeller = user?.id === review.reviewee.id;

  const toggleVote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to vote");

      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from("review_votes")
          .delete()
          .eq("review_id", review.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from("review_votes")
          .insert({
            review_id: review.id,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      setHasVoted(!hasVoted);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => {
      toast.error("Failed to update vote: " + error.message);
    },
  });

  return (
    <>
      <Card className="p-6">
        {/* Reviewer Info */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar>
            <AvatarImage src={review.reviewer.avatar_url || undefined} />
            <AvatarFallback>
              {review.reviewer.full_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{review.reviewer.full_name || "Anonymous"}</span>
              {review.verified_purchase && (
                <Badge variant="secondary" className="text-xs">
                  Verified Purchase
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {/* Review Text */}
        {review.review_text && (
          <p className="text-foreground mb-4 whitespace-pre-wrap leading-relaxed">{review.review_text}</p>
        )}

        {/* Detailed Ratings */}
        {(review.communication_rating || review.packaging_rating || review.speed_rating) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
            {review.communication_rating && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Communication</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= review.communication_rating!
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {review.packaging_rating && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Packaging</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= review.packaging_rating!
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {review.speed_rating && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delivery Speed</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= review.speed_rating!
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Images */}
        {review.review_images && review.review_images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {review.review_images.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Review ${index + 1}`}
                className="rounded-lg object-cover aspect-square w-full hover:scale-105 transition-transform cursor-pointer"
              />
            ))}
          </div>
        )}

        {/* Helpful Button */}
        <div className="flex items-center gap-4">
          <Button
            variant={hasVoted ? "default" : "outline"}
            size="sm"
            onClick={() => toggleVote.mutate()}
            disabled={!user || toggleVote.isPending}
            className="gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful</span>
            {review.helpful_count > 0 && (
              <span className="ml-1">({review.helpful_count})</span>
            )}
          </Button>

          {isSeller && !review.seller_response && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResponseDialogOpen(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Respond</span>
            </Button>
          )}
        </div>

        {/* Seller Response */}
        {review.seller_response && (
          <div className="mt-4 pl-12 border-l-2 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                Seller Response
              </Badge>
              {review.seller_response_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.seller_response_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{review.seller_response}</p>
          </div>
        )}
      </Card>

      {isSeller && (
        <SellerReviewResponseDialog
          open={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          reviewId={review.id}
          reviewerName={review.reviewer.full_name || "the buyer"}
        />
      )}
    </>
  );
}
