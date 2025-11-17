import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { PriceDropAlerts } from "./PriceDropAlerts";
import { useSavedListings } from "@/hooks/useSavedListings";
import { ListingCard } from "@/components/ListingCard";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "./ui/button";

interface RecommendedListing {
  id: string;
  title: string;
  brand: string;
  size: string;
  color: string;
  condition: string;
  seller_price: number;
  fit_score: number;
  reasoning: string;
  images: { image_url: string; display_order: number }[];
}

export const PersonalizedFeed = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSave, isSaving } = useSavedListings();

  const { data, isLoading, error } = useQuery({
    queryKey: ["buyer-recommendations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'buyer-agent-recommendations'
      );
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute to catch new listings
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorDisplay
          title="Failed to load recommendations"
          message="We couldn't load your personalized feed. Please try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const recommendations: RecommendedListing[] = data?.recommendations || [];
  const hasPreferences = data?.user_has_preferences || false;

  if (!hasPreferences) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12 px-6">
          <h3 className="text-2xl font-light mb-3 text-foreground">
            Set up your preferences
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Tell us your preferences and we'll curate a personalized feed just for you.
          </p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No new recommendations right now. Check back soon!
          </p>
          <Button onClick={() => navigate('/browse')}>Browse All Listings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PriceDropAlerts />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {recommendations.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onSaveClick={toggleSave}
              isSaved={isSaved(listing.id)}
              isSaving={isSaving}
              showSaveButton={true}
            />
          ))}
      </div>
    </div>
  );
});
