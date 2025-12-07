import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  set: {
    id: string;
    name: string;
    ptcgoCode?: string;
    printedTotal?: number;
  };
  tcgplayer?: {
    prices?: {
      holofoil?: { market?: number };
      normal?: { market?: number };
      reverseHolofoil?: { market?: number };
    };
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
    };
  };
  images?: {
    large?: string;
    small?: string;
  };
  metadata?: {
    image_ok?: boolean;
    requires_user_upload?: boolean;
  };
}

export interface MagicCardData {
  title: string;
  description: string;
  category: string;
  set_code: string;
  card_number: string;
  rarity?: string;
  original_rrp: number | null;
  image_url?: string;
}

interface MagicCardSearchProps {
  onSelect: (cardData: MagicCardData) => void;
}

export const MagicCardSearch = ({ onSelect }: MagicCardSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Score a card based on data completeness
  const scoreCard = (card: PokemonCard) => {
    let score = 0;
    if (card.images?.small || card.images?.large) score += 10;
    if (card.tcgplayer?.prices || card.cardmarket?.prices) score += 5;
    if (card.rarity) score += 2;
    if (card.artist) score += 1;
    return score;
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else {
        setResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const trimmedQuery = searchQuery.trim();
      const hasSlash = trimmedQuery.includes("/");

      logger.debug("🔍 Global search, query:", trimmedQuery);

      let dbCards;
      let error;

      if (hasSlash) {
        // Full number search with slash: "167/190" or "125/094"
        const normalizedInput = trimmedQuery.replace(/\s/g, "");
        const [numPart, totalPart] = normalizedInput.split('/');

        logger.debug("📊 Parsed:", { numPart, totalPart, normalizedInput });

        const queries = [];

        // BEST: Search printed_number directly (e.g., "125/094")
        queries.push(
          supabase
            .from("pokemon_card_attributes")
            .select("*")
            .eq("printed_number", normalizedInput)
            .limit(12)
        );

        // Also try with padded total (e.g., "125/094" from "125/94")
        if (numPart && totalPart) {
          const paddedTotal = totalPart.padStart(3, '0');
          const paddedFormat = `${numPart}/${paddedTotal}`;
          if (paddedFormat !== normalizedInput) {
            queries.push(
              supabase
                .from("pokemon_card_attributes")
                .select("*")
                .eq("printed_number", paddedFormat)
                .limit(12)
            );
          }
        }

        // Fallback: Search display_number with full format
        queries.push(
          supabase
            .from("pokemon_card_attributes")
            .select("*")
            .eq("display_number", normalizedInput)
            .limit(12)
        );

        // If we have both parts, search by number + printed_total
        if (numPart && totalPart) {
          const totalNum = parseInt(totalPart);

          // Try exact number match with printed_total
          queries.push(
            supabase
              .from("pokemon_card_attributes")
              .select("*")
              .eq("number", numPart)
              .eq("printed_total", totalNum)
              .limit(12)
          );

          // Try with leading zeros (001, 002, etc.)
          const paddedNumber = numPart.padStart(3, '0');
          queries.push(
            supabase
              .from("pokemon_card_attributes")
              .select("*")
              .eq("number", paddedNumber)
              .eq("printed_total", totalNum)
              .limit(12)
          );
        }

        // Execute searches
        const results = await Promise.all(queries);



        const allCards = results.flatMap(r => r.data || []);

        // Remove duplicates by card_id
        const uniqueCards = Array.from(
          new Map(allCards.map(card => [card.card_id, card])).values()
        );

        dbCards = uniqueCards.slice(0, 12);
        error = results.find(r => r.error)?.error;
      } else if (/^\d+$/.test(trimmedQuery)) {
        // Partial number search: "88" or "125"
        // Search by number field and also check if it appears in printed_number
        const queries = [
          supabase
            .from("pokemon_card_attributes")
            .select("*")
            .eq("number", trimmedQuery)
            .limit(12),
          supabase
            .from("pokemon_card_attributes")
            .select("*")
            .ilike("printed_number", `${trimmedQuery}/%`)
            .limit(12)
        ];
        
        const results = await Promise.all(queries);
        const allCards = results.flatMap(r => r.data || []);
        
        // Remove duplicates by card_id
        const uniqueCards = Array.from(
          new Map(allCards.map(card => [card.card_id, card])).values()
        );
        
        dbCards = uniqueCards.slice(0, 12);
        error = results.find(r => r.error)?.error;
      } else {
        // Name search globally
        const result = await supabase
          .from("pokemon_card_attributes")
          .select("*")
          .textSearch("search_vector", trimmedQuery, {
            type: "websearch",
            config: "english",
          })
          .limit(12);
        dbCards = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Transform database results to match PokemonCard interface
      const transformedCards: PokemonCard[] = (dbCards || []).map(card => {
        const images = card.images as Record<string, unknown>;
        const tcgplayerPrices = card.tcgplayer_prices as Record<string, unknown>;
        const cardmarketPrices = card.cardmarket_prices as Record<string, unknown>;
        const displayNumber = (card as Record<string, unknown>).display_number as string || card.number || '';
        const metadata = card.metadata as Record<string, unknown>;

        // Normalize TCGdex image URLs
        let smallImage: string | undefined;
        let largeImage: string | undefined;

        if (images) {
          const baseUrl =
            images.small ||
            images.large ||
            images.tcgdex ||
            images.base ||
            null;

          if (typeof baseUrl === "string") {
            if (/\.(png|webp|jpg|jpeg)$/i.test(baseUrl)) {
              smallImage = baseUrl;
              largeImage = baseUrl;
            } else {
              smallImage = `${baseUrl}/low.webp`;
              largeImage = `${baseUrl}/high.webp`;
            }
          }
        }

        // Use English name if available (for Japanese cards), otherwise use original name
        const displayName = card.name_en || card.name;
        
        return {
          id: card.card_id,
          name: displayName,
          number: displayNumber,
          rarity: card.rarity || undefined,
          artist: card.artist || undefined,
          set: {
            id: card.set_code || '',
            name: card.set_name,
            ptcgoCode: card.set_code || undefined,
          },
          tcgplayer: tcgplayerPrices ? {
            prices: tcgplayerPrices
          } : undefined,
          cardmarket: cardmarketPrices ? {
            prices: cardmarketPrices
          } : undefined,
          images: smallImage || largeImage ? {
            large: largeImage || smallImage,
            small: smallImage || largeImage
          } : undefined,
          metadata: metadata ? {
            image_ok: metadata.image_ok,
            requires_user_upload: metadata.requires_user_upload
          } : undefined
        };
      });

      // Deduplicate by (set_code, number), keeping the card with the highest score
      const dedupedCards = Array.from(
        transformedCards.reduce((map, card) => {
          const key = `${card.set.id}:${card.number}`;
          const existing = map.get(key);
          if (!existing || scoreCard(card) > scoreCard(existing)) {
            map.set(key, card);
          }
          return map;
        }, new Map<string, PokemonCard>()).values()
      );

      setResults(dedupedCards);
    } catch (error) {
      logger.error("Card search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (card: PokemonCard) => {
    let marketPrice = null;

    if (card.tcgplayer?.prices) {
      const prices = card.tcgplayer.prices;
      marketPrice = prices.holofoil?.market ||
        prices.reverseHolofoil?.market ||
        prices.normal?.market ||
        null;
    }

    if (!marketPrice && card.cardmarket?.prices?.averageSellPrice) {
      marketPrice = card.cardmarket.prices.averageSellPrice;
    }

    const cardData: MagicCardData = {
      title: `${card.name} - ${card.set.name}`,
      description: `Authentic ${card.name} from the ${card.set.name} set.\n\nCard Number: ${card.number}\nRarity: ${card.rarity || 'Unknown'}\nArtist: ${card.artist || 'Unknown'}`,
      category: "Pokémon Singles",
      set_code: card.set.ptcgoCode || card.set.id,
      card_number: card.number,
      rarity: card.rarity,
      original_rrp: marketPrice,
      image_url: card.images?.large || card.images?.small
    };

    onSelect(cardData);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        <div className="relative bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1 flex items-center gap-2">
          <div className="pl-3 text-muted-foreground">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </div>
          <Input
            ref={searchInputRef}
            placeholder="Search card number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-base h-11"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setQuery(""); setResults([]); }}
              className="h-8 w-8 p-0 mr-1 rounded-full"
            >
              <span className="sr-only">Clear</span>
              ×
            </Button>
          )}
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
          {results.map((card) => {
            const imageHealthy = card.metadata?.image_ok !== false;
            const needsUpload = card.metadata?.requires_user_upload;
            const showImage = card.images?.small && imageHealthy;

            return (
              <Card
                key={card.id}
                className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
                onClick={() => handleSelect(card)}
              >
                <div className="aspect-[2.5/3.5] relative bg-muted">
                  {showImage ? (
                    <img
                      src={card.images.small}
                      alt={card.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"%3E%3Crect fill="%23f3f4f6" width="100" height="140"/%3E%3Ctext x="50" y="70" font-family="Arial" font-size="12" fill="%239ca3af" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                        e.currentTarget.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
                      <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-center">
                        {needsUpload ? "Upload your photos" : "No stock image"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-background/95 backdrop-blur-sm border-t">
                  <h4 className="font-medium text-sm truncate" title={card.name}>{card.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                      {card.set.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1">
                      {card.number}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {hasSearched && !isSearching && results.length === 0 && query.length >= 2 && (
        <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No cards found. Try a different card number or name.</p>
        </div>
      )}
    </div>
  );
};
