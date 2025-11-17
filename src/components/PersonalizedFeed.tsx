import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth/AuthProvider";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Heart } from "lucide-react";
import { useState } from "react";
import { AgentInsightsPanel } from "./AgentInsightsPanel";
import { PriceDropAlerts } from "./PriceDropAlerts";
import { AgentFeedbackButtons } from "./AgentFeedbackButtons";

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

export const PersonalizedFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showReasoningFor, setShowReasoningFor] = useState<string | null>(null);

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
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <h2 className="text-2xl font-light text-foreground">Your AI-Curated Feed</h2>
          </div>
        </div>
        
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Failed to load recommendations. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const recommendations: RecommendedListing[] = data?.recommendations || [];
  const hasPreferences = data?.user_has_preferences || false;

  if (!hasPreferences) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12 px-6">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-light mb-3 text-foreground">
            Set up your buyer agent
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
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-light text-foreground">Your AI-Curated Feed</h2>
        </div>
        
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-light text-foreground">Your AI-Curated Feed</h2>
          </div>
          <Badge variant="outline" className="text-sm">
            {recommendations.length} matches
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Personalized recommendations based on your preferences and style
        </p>
        
        <PriceDropAlerts />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((listing) => {
          const firstImage = listing.images?.sort(
            (a, b) => a.display_order - b.display_order
          )[0];

          return (
            <div key={listing.id} className="group relative">
              <button
                onClick={() => navigate(`/listing/${listing.id}`)}
                className="text-left w-full"
              >
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-3 relative">
                  {firstImage ? (
                    <img
                      src={firstImage.image_url}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      width="400"
                      height="533"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  
                  {/* Fit Score Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary/90 backdrop-blur-sm">
                      {listing.fit_score}% match
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {listing.brand}
                    </p>
                    {listing.condition && (
                      <Badge variant="secondary" className="text-xs">
                        {listing.condition}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-base font-medium text-foreground">
                      £{Number(listing.seller_price).toFixed(2)}
                    </p>
                    {listing.size && (
                      <Badge variant="outline" className="text-xs">
                        {listing.size}
                      </Badge>
                    )}
                  </div>

                  {/* AI Insights */}
                  <div className="mt-3">
                    <AgentInsightsPanel 
                      fitScore={listing.fit_score}
                      reasoning={listing.reasoning}
                      compact={true}
                    />
                  </div>
                </div>
              </button>

              {/* Feedback and Save Actions */}
              <div className="mt-3 flex items-center justify-between gap-2 px-2">
                <AgentFeedbackButtons listingId={listing.id} compact={true} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement save functionality
                  }}
                >
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
