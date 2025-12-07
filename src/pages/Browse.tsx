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
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { logger } from "@/lib/logger";

const Browse = () => {
  const { marketplace, setMarketplace } = useMarketplace();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    subcategory: "",
    condition: "",
    minPrice: "",
    maxPrice: "",
    brand: "",
    size: "",
    color: "",
    material: "",
    setCode: "",
    setName: "",
    character: "",
    rarity: "",
    tradeEnabled: "",
    freeShipping: "",
    maxDeliveryDays: "",
  });

  const [vibeSearchOpen, setVibeSearchOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<ListingSummary[] | null>(null);
  const [searchMode, setSearchMode] = useState<'browse' | 'semantic' | 'vibe'>('browse');
  const [vibeDescription, setVibeDescription] = useState<string>("");
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular'>('newest');

  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const { data: listings, isLoading, error, refetch } = useQuery({
    queryKey: ["active-listings", page, JSON.stringify(filters), sortBy, marketplace],
    refetchOnMount: 'always',
    staleTime: 0,
    networkMode: 'always',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    queryFn: async () => {
      logger.debug("🔍 [Browse] Starting query with filters:", filters);
      logger.debug("🔍 [Browse] Page:", page, "Sort:", sortBy, "Marketplace:", marketplace);

      try {
        // Health check: Verify Supabase connection
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          logger.error("❌ [Browse] Session error:", sessionError);
        } else {
          logger.debug("✅ [Browse] Session valid:", !!session);
        }

        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let query = supabase
          .from("listings")
          .select(`
            *,
            images:listing_images(image_url, display_order)
          `)
          .eq("status", "active")
          .eq("marketplace", marketplace);

        // Server-side filtering
        if (filters.category) {
          logger.debug("🔍 [Browse] Applying category filter:", filters.category);
          query = query.eq("category", filters.category);
        }
        if (filters.subcategory) {
          logger.debug("🔍 [Browse] Applying subcategory filter:", filters.subcategory);
          query = query.eq("subcategory", filters.subcategory);
        }
        if (filters.condition) {
          logger.debug("🔍 [Browse] Applying condition filter:", filters.condition);
          query = query.eq("condition", filters.condition as any);
        }
        if (filters.minPrice) {
          logger.debug("🔍 [Browse] Applying minPrice filter:", filters.minPrice);
          query = query.gte("seller_price", Number(filters.minPrice));
        }
        if (filters.maxPrice) {
          logger.debug("🔍 [Browse] Applying maxPrice filter:", filters.maxPrice);
          query = query.lte("seller_price", Number(filters.maxPrice));
        }
        if (filters.brand) {
          logger.debug("🔍 [Browse] Applying brand filter:", filters.brand);
          query = query.ilike("brand", `%${filters.brand}%`);
        }
        if (filters.size) {
          query = query.ilike("size", `%${filters.size}%`);
        }
        if (filters.color) {
          query = query.ilike("color", `%${filters.color}%`);
        }
        if (filters.material) {
          query = query.ilike("material", `%${filters.material}%`);
        }
        if (filters.setCode) {
          query = query.ilike("set_code", `%${filters.setCode}%`);
        }
        if (filters.character) {
          // Search for character/Pokemon name in title or description
          logger.debug("🔍 [Browse] Applying character filter:", filters.character);
          query = query.or(`title.ilike.%${filters.character}%,description.ilike.%${filters.character}%`);
        }
        if (filters.rarity) {
          logger.debug("🔍 [Browse] Applying rarity filter:", filters.rarity);
          query = query.ilike("rarity", `%${filters.rarity}%`);
        }
        if (filters.tradeEnabled) {
          query = query.eq("trade_enabled", filters.tradeEnabled === "true");
        }
        if (filters.freeShipping) {
          query = query.eq("free_shipping", filters.freeShipping === "true");
        }
        if (filters.maxDeliveryDays) {
          query = query.lte("estimated_delivery_days", Number(filters.maxDeliveryDays));
        }
        if (filters.search) {
          logger.debug("🔍 [Browse] Applying search filter:", filters.search);
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

        const { data, error: queryError, status, statusText } = await query;

        if (queryError) {
          logger.error("❌ [Browse] Query error:", queryError);
          logger.error("❌ [Browse] Error details:", {
            message: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
            status,
            statusText,
          });
          throw new Error(`Database query failed: ${queryError.message || "Unknown error"}`);
        }

        logger.debug("✅ [Browse] Query successful. Results:", data?.length || 0);
        logger.debug("📊 [Browse] Response status:", status, statusText);

        if (!data) {
          logger.warn("⚠️ [Browse] No data returned (null/undefined)");
          return [];
        }

        return data as ListingSummary[];
      } catch (err) {
        logger.error("[Browse] Unexpected error:", err);
        throw err;
      }
    },
  });

  // For semantic/vibe search results, use those directly
  const filteredListings = useMemo((): ListingSummary[] => {
    if (searchMode !== 'browse' && semanticResults) {
      return semanticResults;
    }

    // Return listings directly - rarity filtering removed since we don't join card data
    return listings || [];
  }, [listings, semanticResults, searchMode, filters.rarity]);

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
            {isLoading ? (
              <span className="text-muted-foreground/50">Loading...</span>
            ) : error ? (
              <span className="text-destructive">Error loading results</span>
            ) : (
              <span>
                {filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'} found
              </span>
            )}
            {import.meta.env.DEV && (
              <span className="ml-2 text-xs opacity-50">
                [Query: {isLoading ? 'loading' : error ? 'error' : 'success'}]
              </span>
            )}
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

      {error ? (
        <ErrorDisplay
          title="Unable to load listings"
          message={error instanceof Error ? error.message : "An error occurred while fetching listings. Please try refreshing the page."}
          onRetry={() => {
            logger.info("🔄 [Browse] Manual retry triggered");
            refetch();
          }}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 min-h-[600px]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredListings && filteredListings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              showSaveButton={true}
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
                subcategory: "",
                condition: "",
                minPrice: "",
                maxPrice: "",
                brand: "",
                size: "",
                color: "",
                material: "",
                setCode: "",
                setName: "",
                character: "",
                rarity: "",
                tradeEnabled: "",
                freeShipping: "",
                maxDeliveryDays: "",
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

      {/* Floating Marketplace Toggle */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="inline-flex items-center gap-1 bg-background border rounded-full shadow-lg p-1">
          <Button
            variant={marketplace === 'UK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setMarketplace('UK');
              setPage(1);
            }}
            className="gap-1.5 h-9 px-3 rounded-full"
          >
            <span className="text-base">🇬🇧</span>
            <span className="hidden sm:inline text-xs">UK</span>
          </Button>
          <Button
            variant={marketplace === 'US' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setMarketplace('US');
              setPage(1);
            }}
            className="gap-1.5 h-9 px-3 rounded-full"
          >
            <span className="text-base">🇺🇸</span>
            <span className="hidden sm:inline text-xs">US</span>
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Browse;
