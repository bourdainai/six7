import { PageLayout } from "@/components/PageLayout";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchFilters, FilterState } from "@/components/SearchFilters";
import { VibeSearchDialog } from "@/components/VibeSearchDialog";
import { useState, useMemo } from "react";
import { ListingCard } from "@/components/ListingCard";
import type { ListingSummary } from "@/types/listings";
import { SEO } from "@/components/SEO";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";

const Browse = () => {
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
  const [semanticResults, setSemanticResults] = useState<ListingSummary[] | null>(null);
  const [searchMode, setSearchMode] = useState<'browse' | 'semantic' | 'vibe'>('browse');
  const [vibeDescription, setVibeDescription] = useState<string>("");
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular'>('newest');

  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const { data: listings, isLoading } = useQuery<ListingSummary[]>({
    queryKey: ["active-listings", page, filters, sortBy],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order),
          seller:profiles!seller_id(id, full_name, trust_score)
        `, { count: 'exact' })
        .eq("status", "active");

      // Server-side filtering
      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.condition) {
        query = query.eq("condition", filters.condition as any);
      }
      if (filters.minPrice) {
        query = query.gte("seller_price", Number(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte("seller_price", Number(filters.maxPrice));
      }
      if (filters.brand) {
        query = query.ilike("brand", `%${filters.brand}%`);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
      }

      // Server-side sorting
      switch (sortBy) {
        case 'price_low':
          query = query.order("seller_price", { ascending: true });
          break;
        case 'price_high':
          query = query.order("seller_price", { ascending: false });
          break;
        case 'popular':
          query = query.order("views", { ascending: false, nullsFirst: false });
          break;
        case 'newest':
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      return data as ListingSummary[];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // For semantic/vibe search results, use those directly
  const filteredListings = useMemo((): ListingSummary[] => {
    if (searchMode !== 'browse' && semanticResults) {
      return semanticResults;
    }

    // Server-side filtering handles everything, just return listings
    return listings || [];
  }, [listings, semanticResults, searchMode]);

  const handleSemanticResults = (results: ListingSummary[]) => {
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

  const handleVibeResults = (results: ListingSummary[], description: string) => {
    setSemanticResults(results);
    setVibeDescription(description);
    setSearchMode('vibe');
  };

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || filters.search;
  const categoryQuery = filters.category || '';
  
  // Build dynamic SEO based on filters
  const seoTitle = searchQuery 
    ? `Search Results for "${searchQuery}" | 6Seven Pokémon Card Marketplace`
    : categoryQuery
    ? `Shop ${categoryQuery} | 6Seven Pokémon Card Marketplace`
    : "Browse Pokémon Cards | 6Seven Marketplace";
    
  const seoDescription = searchQuery
    ? `Find ${searchQuery} Pokémon cards on 6Seven. Browse graded and raw cards with AI-powered search and pricing comps.`
    : categoryQuery
    ? `Shop ${categoryQuery} Pokémon cards on 6Seven. Discover great deals on singles, sealed product, and graded slabs.`
    : "Browse thousands of Pokémon card listings on 6Seven. AI-powered search, pricing comps, and trade offers built for card collectors.";

  const seoKeywords = searchQuery
    ? `${searchQuery} pokemon cards, buy ${searchQuery}, sell ${searchQuery}, pokemon marketplace, 6Seven`
    : categoryQuery
    ? `${categoryQuery} pokemon cards, buy ${categoryQuery}, ${categoryQuery} pokemon marketplace, 6Seven`
    : "pokemon cards, pokemon tcg, graded pokemon cards, raw pokemon cards, card marketplace, trading cards, 6Seven";

  return (
    <PageLayout>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        url={`https://6seven.ai/browse${location.search}`}
        canonical={`https://6seven.ai/browse${location.search}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": seoTitle,
          "description": seoDescription,
          "url": `https://6seven.ai/browse${location.search}`
        }}
      />
      
      <div className="mb-8 space-y-6">
        {/* Magical Search Bar */}
        <div className="pt-4">
          <SearchFilters 
            onFilterChange={setFilters}
            activeFilters={filters}
            onSemanticSearch={handleSemanticResults}
            onSearchTypeChange={handleSearchTypeChange}
            onVibeSearchClick={() => setVibeSearchOpen(true)}
          />
        </div>

        {/* Contextual Search Info */}
        {searchMode === 'vibe' && vibeDescription && (
          <div className="max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-top-2">
            <p className="text-sm text-muted-foreground bg-secondary/30 inline-block px-4 py-2 rounded-full">
              <span className="font-medium text-foreground">AI Vibe Match:</span> {vibeDescription}
            </p>
          </div>
        )}

        {/* Results Header & Sorting */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-0">
          <p className="text-sm text-muted-foreground font-normal">
            {filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'} found
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-normal hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-9 px-3 bg-background border border-border text-sm hover:bg-secondary/50 transition-colors duration-200 rounded-md font-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredListings && filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              showSaveButton={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 max-w-md mx-auto">
          <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No cards found</h3>
          <p className="text-muted-foreground mb-6">
            {Object.values(filters).some(v => v) 
              ? "We couldn't find any cards matching your specific filters. Try broadening your search."
              : "There are no listings available at the moment."}
          </p>
          {Object.values(filters).some(v => v) && (
            <Button 
              variant="outline" 
              onClick={() => setFilters({
                search: "",
                category: "",
                condition: "",
                minPrice: "",
                maxPrice: "",
                brand: "",
                size: "",
              })}
            >
              Clear Filters
            </Button>
          )}
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
