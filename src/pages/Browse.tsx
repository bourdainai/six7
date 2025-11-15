import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SearchFilters, FilterState } from "@/components/SearchFilters";
import { SemanticSearchBar } from "@/components/SemanticSearchBar";
import { VibeSearchDialog } from "@/components/VibeSearchDialog";
import { useState, useMemo } from "react";
import { Image, Sparkles } from "lucide-react";
import { SellerReputation } from "@/components/seller/SellerReputation";

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
  const [vibeSearchOpen, setVibeSearchOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);
  const [searchMode, setSearchMode] = useState<'browse' | 'semantic' | 'vibe'>('browse');
  const [vibeDescription, setVibeDescription] = useState<string>("");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["active-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order),
          seller:profiles!seller_id(id, full_name, trust_score)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  // Client-side filtering - only apply when in browse mode
  const filteredListings = useMemo(() => {
    // If we have semantic/vibe search results, use those
    if (searchMode !== 'browse' && semanticResults) {
      return semanticResults;
    }

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
  }, [listings, filters, semanticResults, searchMode]);

  const handleSemanticResults = (results: any[]) => {
    setSemanticResults(results);
    setSearchMode('semantic');
  };

  const handleVibeResults = (results: any[], description: string) => {
    setSemanticResults(results);
    setVibeDescription(description);
    setSearchMode('vibe');
  };

  const resetToBrowse = () => {
    setSemanticResults(null);
    setSearchMode('browse');
    setVibeDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light text-foreground">
              {searchMode === 'semantic' && 'AI Search Results'}
              {searchMode === 'vibe' && 'Vibe Search Results'}
              {searchMode === 'browse' && 'Browse'}
            </h1>
            {searchMode !== 'browse' && (
              <Button variant="outline" onClick={resetToBrowse}>
                Back to Browse
              </Button>
            )}
          </div>

          {searchMode === 'vibe' && vibeDescription && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm">
                <span className="font-medium">AI detected style:</span> {vibeDescription}
              </p>
            </div>
          )}

          {/* Semantic Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1">
              <SemanticSearchBar 
                onResults={handleSemanticResults}
                onSearchTypeChange={(type) => setSearchMode(type === 'semantic' ? 'semantic' : 'browse')}
              />
            </div>
            <Button
              onClick={() => setVibeSearchOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Image className="h-4 w-4" />
              Vibe Search
            </Button>
          </div>
          
          {searchMode === 'browse' && (
            <SearchFilters
              onFilterChange={setFilters}
              activeFilters={filters}
            />
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredListings?.length || 0} items {searchMode !== 'browse' ? 'found' : filters.search || Object.values(filters).some(v => v) ? 'found' : 'available'}
            {searchMode === 'semantic' && (
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Ranked
              </Badge>
            )}
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

                    {listing.seller?.id && (
                      <div className="pt-1">
                        <SellerReputation sellerId={listing.seller.id} compact />
                      </div>
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

      <VibeSearchDialog
        open={vibeSearchOpen}
        onOpenChange={setVibeSearchOpen}
        onResults={handleVibeResults}
      />
    </div>
  );
};

export default Browse;