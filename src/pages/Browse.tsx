import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { SearchFilters, FilterState } from "@/components/SearchFilters";
import { useState, useMemo } from "react";

const Browse = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    condition: "",
    minPrice: "",
    maxPrice: "",
    brand: "",
    size: "",
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["active-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order),
          seller:profiles!seller_id(full_name, trust_score)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  // Client-side filtering
  const filteredListings = useMemo(() => {
    if (!listings) return [];

    return listings.filter((listing) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          listing.title?.toLowerCase().includes(searchLower) ||
          listing.description?.toLowerCase().includes(searchLower) ||
          listing.brand?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && listing.category !== filters.category) {
        return false;
      }

      // Condition filter
      if (filters.condition && listing.condition !== filters.condition) {
        return false;
      }

      // Price filters
      if (filters.minPrice && listing.seller_price < Number(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && listing.seller_price > Number(filters.maxPrice)) {
        return false;
      }

      // Brand filter
      if (filters.brand) {
        const brandLower = filters.brand.toLowerCase();
        if (!listing.brand?.toLowerCase().includes(brandLower)) {
          return false;
        }
      }

      // Size filter
      if (filters.size && listing.size !== filters.size) {
        return false;
      }

      return true;
    });
  }, [listings, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-6">Browse</h1>
          
          <SearchFilters
            onFilterChange={setFilters}
            activeFilters={filters}
          />
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredListings?.length || 0} items {filters.search || Object.values(filters).some(v => v) ? 'found' : 'available'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredListings && filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => {
              const firstImage = listing.images?.sort(
                (a, b) => a.display_order - b.display_order
              )[0];

              return (
                <button
                  key={listing.id}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  className="group text-left"
                >
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-3">
                    {firstImage ? (
                      <img
                        src={firstImage.image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
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
                      {listing.original_rrp && (
                        <p className="text-xs text-muted-foreground line-through">
                          £{Number(listing.original_rrp).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {listing.size && (
                      <p className="text-xs text-muted-foreground">Size: {listing.size}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {Object.values(filters).some(v => v) 
                ? "No items match your filters. Try adjusting your search."
                : "No items available yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;