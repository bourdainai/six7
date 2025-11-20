import { useQuery } from "@tanstack/react-query";
import type { ListingSummary } from "@/types/listings";
import { supabase } from "@/integrations/supabase/client";
import { FeedCard } from "./FeedCard";
import { Loader2 } from "lucide-react";

export function VerticalFeed() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["feed-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          listing_images(image_url, display_order)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No listings available</p>
      </div>
    );
  }

  return (
    <div className="snap-y snap-mandatory h-screen w-full overflow-y-scroll bg-background">
      {listings.map((listing: ListingSummary) => (
        <FeedCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
