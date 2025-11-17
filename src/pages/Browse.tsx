import { PageLayout } from "@/components/PageLayout";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SearchFilters, FilterState } from "@/components/SearchFilters";
import { VibeSearchDialog } from "@/components/VibeSearchDialog";
import { useState, useMemo } from "react";
import { Image } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular'>('newest');

  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const { data: listings, isLoading } = useQuery({
    queryKey: ["active-listings", page],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order),
          seller:profiles!seller_id(id, full_name, trust_score)
        `, { count: 'exact' })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Client-side filtering and sorting
  const filteredListings = useMemo(() => {
    // If we have semantic/vibe search results, use those
    if (searchMode !== 'browse' && semanticResults) {
      return semanticResults;
    }

    if (!listings) return [];

    let filtered = listings.filter((listing) => {
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

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.seller_price - b.seller_price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.seller_price - a.seller_price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'relevance':
      default:
        // Keep default order for relevance
        break;
    }

    return filtered;
  }, [listings, filters, semanticResults, searchMode, sortBy]);

  const handleSemanticResults = (results: any[]) => {
    setSemanticResults(results);
    setSearchMode('semantic');
  };

  const handleSearchTypeChange = (type: 'browse' | 'semantic') => {
    if (type === 'browse') {
      setSearchMode('browse');
      setSemanticResults(null);
    } else {
      setSearchMode('semantic');
    }
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
    <PageLayout>
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-2">
              <h1 className="text-3xl font-light text-foreground">
                {searchMode === 'semantic' && 'AI Search Results'}
                {searchMode === 'vibe' && 'Vibe Search Results'}
                {searchMode === 'browse' && 'Browse'}
              </h1>
              {searchMode === 'browse' && (
                <p className="text-base text-muted-foreground font-light">
                  Discover unique items from verified sellers
                </p>
              )}
            </div>
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

          <SearchFilters 
            onFilterChange={setFilters}
            activeFilters={filters}
            onSemanticSearch={handleSemanticResults}
            onSearchTypeChange={handleSearchTypeChange}
            onVibeSearchClick={() => setVibeSearchOpen(true)}
          />

          {/* Sorting Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-3 rounded-lg bg-background border border-border text-sm hover:bg-accent/50 transition-colors"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        <VibeSearchDialog
          open={vibeSearchOpen}
          onOpenChange={setVibeSearchOpen}
          onResults={handleVibeResults}
        />

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredListings?.length || 0} items {searchMode !== 'browse' ? 'found' : filters.search || Object.values(filters).some(v => v) ? 'found' : 'available'}
            {searchMode === 'semantic' && (
              <Badge variant="secondary" className="ml-2">
                AI Ranked
              </Badge>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ListingCardSkeleton key={i} />
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

        {/* Pagination Controls */}
        {searchMode === 'browse' && !isLoading && filteredListings.length > 0 && (
          <div className="mt-12 flex justify-center items-center gap-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              variant="outline"
              disabled={!listings || listings.length < itemsPerPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
    </PageLayout>
  );
};

export default Browse;