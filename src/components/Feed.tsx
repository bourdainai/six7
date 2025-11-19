import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { PriceDropAlerts } from "./PriceDropAlerts";
import { useSavedListings } from "@/hooks/useSavedListings";
import { ListingCard } from "@/components/ListingCard";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "./ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Feed = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSave, isSaving } = useSavedListings();

  const { data: listings, isLoading, error } = useQuery({
    queryKey: ["active-listings"],
    queryFn: async () => {
      // Simple, fast query: get active listings, newest first
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          images:listing_images(image_url, display_order)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50); // Fetch top 50 newest items
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
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
          title="Failed to load listings"
          message="We couldn't load the feed. Please try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No active listings found. Check back soon!
          </p>
          <Button onClick={() => navigate('/sell')}>List the First Item</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {user && <PriceDropAlerts />}

      <div className="flex items-center justify-between mb-6 mt-8">
        <h2 className="text-2xl font-light text-foreground">Latest Arrivals</h2>
        <Button variant="ghost" onClick={() => navigate('/browse')}>View All</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing as any}
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

