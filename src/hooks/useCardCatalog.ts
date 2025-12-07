import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SortOption = 
  | "synced_newest" 
  | "synced_oldest" 
  | "created_newest" 
  | "created_oldest"
  | "name_asc"
  | "name_desc"
  | "set_number";

export interface CardCatalogFilters {
  language?: string;
  setCode?: string;
  search?: string;
  dataStatus?: "all" | "missing_images" | "missing_prices" | "complete";
  syncSource?: string;
  rarity?: string;
  sortBy?: SortOption;
}

export interface CardCatalogCard {
  id: string;
  card_id: string;
  name: string;
  name_en: string | null;
  set_name: string;
  set_code: string;
  number: string;
  display_number: string | null;
  rarity: string | null;
  artist: string | null;
  types: string[] | null;
  supertype: string | null;
  subtypes: string[] | null;
  images: {
    small?: string;
    large?: string;
    source?: string;
  } | null;
  tcgplayer_prices: Record<string, any> | null;
  cardmarket_prices: Record<string, any> | null;
  tcgplayer_id: string | null;
  cardmarket_id: string | null;
  printed_total: number | null;
  sync_source: string | null;
  synced_at: string | null;
  last_price_update: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CardCatalogStats {
  total: number;
  withImages: number;
  missingImages: number;
  withPrices: number;
  missingPrices: number;
  byLanguage: Record<string, number>;
  bySyncSource: Record<string, number>;
}

export interface UseCardCatalogOptions {
  filters: CardCatalogFilters;
  page: number;
  pageSize?: number;
}

export function useCardCatalog({ filters, page, pageSize = 50 }: UseCardCatalogOptions) {
  return useQuery({
    queryKey: ["card-catalog", filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.setCode) {
        query = query.eq("set_code", filters.setCode);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,card_id.ilike.%${filters.search}%,number.eq.${filters.search}`);
      }

      if (filters.syncSource) {
        query = query.eq("sync_source", filters.syncSource as "cron" | "github" | "justtcg" | "manual" | "on_demand" | "pokemon_tcg_api" | "tcgdex");
      }

      if (filters.rarity) {
        query = query.eq("rarity", filters.rarity);
      }

      if (filters.language) {
        // Language is stored in metadata or inferred from card_id prefix
        if (filters.language === "japanese") {
          query = query.or("card_id.ilike.tcgdex_ja_%,card_id.ilike.%_ja_%,metadata->>language.eq.ja");
        } else if (filters.language === "english") {
          query = query.or("card_id.ilike.github_%,card_id.ilike.tcgdex_en_%,metadata->>language.eq.en");
        }
      }

      if (filters.dataStatus === "missing_images") {
        query = query.or("images.is.null,images->small.is.null");
      } else if (filters.dataStatus === "missing_prices") {
        query = query.is("tcgplayer_prices", null).is("cardmarket_prices", null);
      } else if (filters.dataStatus === "complete") {
        query = query
          .not("images", "is", null)
          .not("images->small", "is", null)
          .or("tcgplayer_prices.not.is.null,cardmarket_prices.not.is.null");
      }

      // Apply pagination and ordering
      const from = page * pageSize;
      const to = from + pageSize - 1;

      // Apply sorting
      const sortBy = filters.sortBy || "synced_newest";
      switch (sortBy) {
        case "synced_newest":
          query = query.order("synced_at", { ascending: false, nullsFirst: false });
          break;
        case "synced_oldest":
          query = query.order("synced_at", { ascending: true, nullsFirst: true });
          break;
        case "created_newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "created_oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "name_asc":
          query = query.order("name", { ascending: true });
          break;
        case "name_desc":
          query = query.order("name", { ascending: false });
          break;
        case "set_number":
        default:
          query = query
            .order("set_code", { ascending: true })
            .order("number", { ascending: true });
          break;
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        cards: data as CardCatalogCard[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

export function useCardCatalogStats() {
  return useQuery({
    queryKey: ["card-catalog-stats"],
    queryFn: async () => {
      // Get total count (uses exact count, not limited)
      const { count: total } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true });

      // Get count with images (uses exact count, not limited)
      const { count: withImages } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .not("images", "is", null)
        .not("images->small", "is", null);

      // Get count with prices (uses exact count, not limited)
      const { count: withPrices } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .or("tcgplayer_prices.not.is.null,cardmarket_prices.not.is.null");

      // CRITICAL: Fetch ALL sync sources in batches to get accurate distribution
      const BATCH_SIZE = 1000;
      let allSyncSources: Array<{ sync_source: string | null }> = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pokemon_card_attributes")
          .select("sync_source")
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allSyncSources = allSyncSources.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      const bySyncSource: Record<string, number> = {};
      allSyncSources.forEach((card) => {
        const source = card.sync_source || "unknown";
        bySyncSource[source] = (bySyncSource[source] || 0) + 1;
      });

      console.log(`[useCardCatalogStats] Sync source distribution:`, bySyncSource);

      return {
        total: total || 0,
        withImages: withImages || 0,
        missingImages: (total || 0) - (withImages || 0),
        withPrices: withPrices || 0,
        missingPrices: (total || 0) - (withPrices || 0),
        byLanguage: {}, // Would need separate query
        bySyncSource,
      } as CardCatalogStats;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export interface SetWithCount {
  code: string;
  name: string;
  cardCount: number;
  lastSynced: string | null;
}

export function useCardSets() {
  return useQuery({
    queryKey: ["card-sets-with-counts"],
    queryFn: async () => {
      // CRITICAL: Supabase limits to 1000 rows by default
      // We need to fetch ALL cards in batches to get accurate counts
      const BATCH_SIZE = 1000;
      let allCards: Array<{ set_code: string | null; set_name: string | null; synced_at: string | null }> = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pokemon_card_attributes")
          .select("set_code, set_name, synced_at")
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCards = allCards.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      console.log(`[useCardSets] Fetched ${allCards.length} cards total`);

      // Aggregate by set
      const setsMap = new Map<string, { name: string; count: number; lastSynced: string | null }>();
      
      allCards.forEach((card) => {
        if (card.set_code) {
          const existing = setsMap.get(card.set_code);
          if (existing) {
            existing.count++;
            // Track most recent sync
            if (card.synced_at && (!existing.lastSynced || card.synced_at > existing.lastSynced)) {
              existing.lastSynced = card.synced_at;
            }
          } else {
            setsMap.set(card.set_code, {
              name: card.set_name || card.set_code,
              count: 1,
              lastSynced: card.synced_at,
            });
          }
        }
      });

      // Convert to array and sort by most recently synced first
      const setsArray = Array.from(setsMap.entries()).map(([code, data]) => ({
        code,
        name: data.name,
        cardCount: data.count,
        lastSynced: data.lastSynced,
      }));

      console.log(`[useCardSets] Found ${setsArray.length} unique sets`);

      // Sort: recently synced first, then alphabetically
      return setsArray.sort((a, b) => {
        // If both have sync dates, sort by newest first
        if (a.lastSynced && b.lastSynced) {
          return new Date(b.lastSynced).getTime() - new Date(a.lastSynced).getTime();
        }
        // If only one has sync date, prioritize it
        if (a.lastSynced) return -1;
        if (b.lastSynced) return 1;
        // Fall back to alphabetical by name
        return a.name.localeCompare(b.name);
      });
    },
    staleTime: 60000, // Cache for 1 minute (shorter to show new imports faster)
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useCardRarities() {
  return useQuery({
    queryKey: ["card-rarities"],
    queryFn: async () => {
      // CRITICAL: Fetch ALL rarities in batches to get complete list
      const BATCH_SIZE = 1000;
      let allRarities: Array<{ rarity: string | null }> = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pokemon_card_attributes")
          .select("rarity")
          .not("rarity", "is", null)
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRarities = allRarities.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      // Get unique rarities
      const rarities = new Set<string>();
      allRarities.forEach((card) => {
        if (card.rarity) rarities.add(card.rarity);
      });

      return Array.from(rarities).sort();
    },
    staleTime: 300000,
  });
}

// Duplicate Detection Types
export interface DuplicateStats {
  totalGroups: number;
  totalDuplicates: number;
  affectedSets: Array<{ set_code: string; duplicates: number }>;
}

export interface DuplicateGroup {
  set_code: string;
  number: string;
  count: number;
  cards: Array<{
    id: string;
    card_id: string;
    name: string;
    sync_source: string;
    synced_at: string;
    has_images: boolean;
    has_prices: boolean;
  }>;
}

export interface DuplicateDetectionResult {
  success: boolean;
  stats: DuplicateStats;
  sampleGroups: DuplicateGroup[];
}

export interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  stats: {
    duplicateGroups: number;
    cardsToDelete: number;
    actualDeleted: number;
    remainingDuplicates?: number;
    iterations?: number;
  };
  message?: string;
  errors?: string[];
  sampleDeleted?: Array<{
    card_id: string;
    name: string;
    set_code: string;
    number: string;
    reason: string;
  }>;
  sampleKept?: Array<{
    card_id: string;
    name: string;
    set_code: string;
    number: string;
  }>;
}

// Hook to detect duplicates
export function useDuplicateDetection() {
  return useQuery({
    queryKey: ["duplicate-detection"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<DuplicateDetectionResult>(
        "detect-duplicates"
      );

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
}

// Hook to cleanup duplicates
export function useCleanupDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dryRun = true }: { dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke<CleanupResult>(
        "cleanup-duplicates",
        {
          body: { dryRun },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate related queries after cleanup
      if (!data?.dryRun) {
        queryClient.invalidateQueries({ queryKey: ["card-catalog"] });
        queryClient.invalidateQueries({ queryKey: ["card-catalog-stats"] });
        queryClient.invalidateQueries({ queryKey: ["card-sets-with-counts"] });
        queryClient.invalidateQueries({ queryKey: ["duplicate-detection"] });
        queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      }
    },
  });
}

