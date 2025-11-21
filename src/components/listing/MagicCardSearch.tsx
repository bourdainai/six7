import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

      console.log("🔍 Global search, query:", trimmedQuery);

      let dbCards;
      let error;

      if (hasSlash) {
        // Full number search with slash: "088/182" or "88/182"
        // Normalize: lowercase, remove spaces, pad the number part if needed
        const normalizedInput = trimmedQuery.toLowerCase().replace(/\s/g, "");
        const [numPart, totalPart] = normalizedInput.split('/');
        
        // Try both with and without leading zeros
        const queries = [];
        
        // Try exact match first (Japanese cards only)
        queries.push(
          supabase
            .from("pokemon_card_attributes")
            .select("*")
            .eq("search_number", normalizedInput)
            .eq("metadata->>language", "ja")
            .limit(12)
        );
        
        // If the number part doesn't have leading zeros, also try with them
        if (numPart && totalPart && numPart.length < 3) {
          const paddedNumber = numPart.padStart(3, '0') + '/' + totalPart;
          queries.push(
            supabase
              .from("pokemon_card_attributes")
              .select("*")
              .eq("search_number", paddedNumber)
              .eq("metadata->>language", "ja")
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
        console.log("🎯 Full number search:", dbCards?.length || 0, "cards found");
      } else if (/^\d+$/.test(trimmedQuery)) {
        // Partial number search: "88" - returns cards with that number from all sets (Japanese only)
        const result = await supabase
          .from("pokemon_card_attributes")
          .select("*")
          .eq("number", trimmedQuery)
          .eq("metadata->>language", "ja")
          .limit(12);
        dbCards = result.data;
        error = result.error;
        console.log("🔢 Number search:", dbCards?.length || 0, "cards found");
      } else {
        // Name search globally (Japanese only)
        const result = await supabase
          .from("pokemon_card_attributes")
          .select("*")
          .textSearch("search_vector", trimmedQuery, {
            type: "websearch",
            config: "english",
          })
          .eq("metadata->>language", "ja")
          .limit(12);
        dbCards = result.data;
        error = result.error;
        console.log("📝 Name search:", dbCards?.length || 0, "cards found");
      }

      if (error) throw error;

      // Transform database results to match PokemonCard interface
      const transformedCards: PokemonCard[] = (dbCards || []).map(card => {
      const images = card.images as any;
      const tcgplayerPrices = card.tcgplayer_prices as any;
      const cardmarketPrices = card.cardmarket_prices as any;
      const displayNumber = (card as any).display_number || card.number || '';

      // Normalize TCGdex image URLs: they need quality + extension to be real images
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
          // If the URL already has an extension, keep it as-is
          if (/\.(png|webp|jpg|jpeg)$/i.test(baseUrl)) {
            smallImage = baseUrl;
            largeImage = baseUrl;
          } else {
            smallImage = `${baseUrl}/low.webp`;
            largeImage = `${baseUrl}/high.webp`;
          }
        }
      }

      return {
        id: card.card_id,
        name: card.name,
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
        } : undefined
      };
      });

      setResults(transformedCards);
    } catch (error) {
      console.error("Card search error:", error);
      // Don't toast on every debounce error, just log
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (card: PokemonCard) => {
    // Extract market price from available sources
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

    // Transform data to our listing format
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
    <div className="w-full space-y-4">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl opacity-30 group-hover:opacity-50 transition duration-500 blur"></div>
        <div className="relative bg-background rounded-xl border shadow-sm p-1 flex items-center gap-2">
          <div className="pl-3 text-muted-foreground">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </div>
          <Input
            ref={searchInputRef}
            placeholder="Magic Search: Type full number (4/102) or card name (Charizard)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-lg h-12"
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
          {results.map((card) => (
            <Card
              key={card.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
              onClick={() => handleSelect(card)}
            >
              <div className="aspect-[2.5/3.5] relative bg-muted">
                <img
                  src={card.images?.small}
                  alt={card.name}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"%3E%3Crect fill="%23f3f4f6" width="100" height="140"/%3E%3Ctext x="50" y="70" font-family="Arial" font-size="12" fill="%239ca3af" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    e.currentTarget.onerror = null; // Prevent infinite loop
                  }}
                />
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
          ))}
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

