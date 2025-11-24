import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard } from "./ReviewCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface ReviewListProps {
  sellerId?: string;
  listingId?: string;
  limit?: number;
}

export function ReviewList({ sellerId, listingId, limit }: ReviewListProps) {
  const { user } = useAuth();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", sellerId, listingId, limit],
    queryFn: async () => {
      let query = supabase
        .from("ratings")
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url),
          reviewee:profiles!reviewee_id(id, full_name)
        `)
        .order("created_at", { ascending: false });

      if (sellerId) {
        query = query.eq("reviewee_id", sellerId);
      }
      if (listingId) {
        query = query.eq("listing_id", listingId);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: userVotes } = useQuery({
    queryKey: ["user-review-votes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("review_votes")
        .select("review_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((v) => v.review_id);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
        <p className="text-muted-foreground">
          Be the first to leave a review after completing a purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review as any}
          userVoted={userVotes?.includes(review.id)}
        />
      ))}
    </div>
  );
}
