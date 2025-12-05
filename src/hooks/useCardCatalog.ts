import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CardCatalogFilters {
  language?: string;
  setCode?: string;
  search?: string;
  dataStatus?: "all" | "missing_images" | "missing_prices" | "complete";
  syncSource?: string;
  rarity?: string;
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
        query = query.eq("sync_source", filters.syncSource);
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

      query = query
        .order("set_code", { ascending: true })
        .order("number", { ascending: true })
        .range(from, to);

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
      // Get total count
      const { count: total } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true });

      // Get count with images
      const { count: withImages } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .not("images", "is", null)
        .not("images->small", "is", null);

      // Get count with prices
      const { count: withPrices } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .or("tcgplayer_prices.not.is.null,cardmarket_prices.not.is.null");

      // Get sync source distribution
      const { data: syncSourceData } = await supabase
        .from("pokemon_card_attributes")
        .select("sync_source");

      const bySyncSource: Record<string, number> = {};
      syncSourceData?.forEach((card) => {
        const source = card.sync_source || "unknown";
        bySyncSource[source] = (bySyncSource[source] || 0) + 1;
      });

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

export function useCardSets() {
  return useQuery({
    queryKey: ["card-sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pokemon_card_attributes")
        .select("set_code, set_name")
        .order("set_code");

      if (error) throw error;

      // Get unique sets
      const setsMap = new Map<string, string>();
      data?.forEach((card) => {
        if (card.set_code && !setsMap.has(card.set_code)) {
          setsMap.set(card.set_code, card.set_name || card.set_code);
        }
      });

      return Array.from(setsMap.entries()).map(([code, name]) => ({
        code,
        name,
      }));
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

export function useCardRarities() {
  return useQuery({
    queryKey: ["card-rarities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pokemon_card_attributes")
        .select("rarity")
        .not("rarity", "is", null);

      if (error) throw error;

      // Get unique rarities
      const rarities = new Set<string>();
      data?.forEach((card) => {
        if (card.rarity) rarities.add(card.rarity);
      });

      return Array.from(rarities).sort();
    },
    staleTime: 300000,
  });
}

