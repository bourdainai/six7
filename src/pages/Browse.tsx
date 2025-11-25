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
import { useAuth } from "@/components/auth/AuthProvider";

const Browse = () => {
  const { user } = useAuth();
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

  // Get user's country for region filtering
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: listings, isLoading, error } = useQuery({
    queryKey: ["active-listings", page, JSON.stringify(filters), sortBy, profile?.country],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order),
          seller:profiles!listings_seller_id_fkey(id, country)
        `)
        .eq("status", "active");

      // Filter by seller's country if user has a country set
      if (profile?.country) {
        // We need to filter where seller.country matches user's country
        // Since we're doing a join, we need to check the nested seller.country
        const { data: allListings, error: fetchError } = await supabase
          .from("listings")
          .select(`
            *,
            images:listing_images(image_url, display_order),
            seller:profiles!listings_seller_id_fkey(id, full_name, trust_score, country)
          `)
          .eq("status", "active");

        // If region-specific query fails, log and fall back to global query below
        if (!fetchError && allListings) {
          // Filter in JS for now (we can optimize with a view later)
          const filteredByRegion =
            allListings.filter((listing: any) => listing.seller?.country === profile.country) || [];

          // Only apply region filtering when we actually have results
          if (filteredByRegion.length > 0) {
            let filteredData = filteredByRegion;

            // Apply filters
            if (filters.category) {
              filteredData = filteredData.filter((l: any) => l.category === filters.category);
            }
            if (filters.subcategory) {
              filteredData = filteredData.filter((l: any) => l.subcategory === filters.subcategory);
            }
            if (filters.condition) {
              filteredData = filteredData.filter((l: any) => l.condition === filters.condition);
            }
            if (filters.minPrice) {
              filteredData = filteredData.filter((l: any) => l.seller_price >= Number(filters.minPrice));
            }
            if (filters.maxPrice) {
              filteredData = filteredData.filter((l: any) => l.seller_price <= Number(filters.maxPrice));
            }
            if (filters.brand) {
              filteredData = filteredData.filter((l: any) =>
                l.brand?.toLowerCase().includes(filters.brand.toLowerCase())
              );
            }
            if (filters.size) {
              filteredData = filteredData.filter((l: any) =>
                l.size?.toLowerCase().includes(filters.size.toLowerCase())
              );
            }
            if (filters.color) {
              filteredData = filteredData.filter((l: any) =>
                l.color?.toLowerCase().includes(filters.color.toLowerCase())
              );
            }
            if (filters.material) {
              filteredData = filteredData.filter((l: any) =>
                l.material?.toLowerCase().includes(filters.material.toLowerCase())
              );
            }
            if (filters.setCode) {
              filteredData = filteredData.filter((l: any) =>
                l.set_code?.toLowerCase().includes(filters.setCode.toLowerCase())
              );
            }
            if (filters.tradeEnabled) {
              filteredData = filteredData.filter(
                (l: any) => l.trade_enabled === (filters.tradeEnabled === "true")
              );
            }
            if (filters.freeShipping) {
              filteredData = filteredData.filter(
                (l: any) => l.free_shipping === (filters.freeShipping === "true")
              );
            }
            if (filters.maxDeliveryDays) {
              filteredData = filteredData.filter(
                (l: any) => (l.estimated_delivery_days || 0) <= Number(filters.maxDeliveryDays)
              );
            }
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              filteredData = filteredData.filter((l: any) =>
                l.title?.toLowerCase().includes(searchLower) ||
                l.description?.toLowerCase().includes(searchLower) ||
                l.brand?.toLowerCase().includes(searchLower)
              );
            }

            // Apply sorting
            filteredData.sort((a: any, b: any) => {
              switch (sortBy) {
                case "price_low":
                  return a.seller_price - b.seller_price;
                case "price_high":
                  return b.seller_price - a.seller_price;
                case "popular":
                  return (b.views || 0) - (a.views || 0);
                case "newest":
                default:
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
            });

            // Apply pagination
            return filteredData.slice(from, to + 1) as unknown as ListingSummary[];
          }
        }
      }

      // If no user region, show all listings (fallback for non-logged-in users)
      
        // Server-side filtering
        if (filters.category) {
          query = query.eq("category", filters.category);
        }
        if (filters.subcategory) {
          query = query.eq("subcategory", filters.subcategory);
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
      
      if (error) {
        console.error("Browse query error:", error);
        throw error;
      }
      
      return (data || []) as unknown as ListingSummary[];
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
                subcategory: "",
                condition: "",
                minPrice: "",
                maxPrice: "",
                brand: "",
                size: "",
                color: "",
                material: "",
                setCode: "",
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
    </PageLayout>
  );
};

export default Browse;
