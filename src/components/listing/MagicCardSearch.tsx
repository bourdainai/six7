import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MagicCardSearchProps {
  onSelect: (cardData: any) => void;
}

export const MagicCardSearch = ({ onSelect }: MagicCardSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
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
      const { data, error } = await supabase.functions.invoke('pokemon-search', {
        body: { query: searchQuery, pageSize: 12 }
      });

      if (error) throw error;
      setResults(data.data || []);
    } catch (error) {
      console.error("Card search error:", error);
      // Don't toast on every debounce error, just log
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (card: any) => {
    // Transform API data to our listing format
    const cardData = {
      title: `${card.name} - ${card.set.name}`,
      description: `Authentic ${card.name} from the ${card.set.name} set.\n\nCard Number: ${card.number}/${card.set.printedTotal || '??'}\nRarity: ${card.rarity || 'Unknown'}\nArtist: ${card.artist || 'Unknown'}`,
      category: "Pokémon Singles",
      set_code: card.set.ptcgoCode || card.set.id, // Preference for short code
      card_number: card.number,
      rarity: card.rarity,
      original_rrp: card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || card.cardmarket?.prices?.averageSellPrice || null,
      image_url: card.images?.large || card.images?.small
    };
    
    onSelect(cardData);
    setQuery(""); // Reset search
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
            placeholder="Magic Search: Type card name (e.g. 'Charizard 4')"
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
          <p>No cards found. Try typing just the Pokémon name.</p>
        </div>
      )}
    </div>
  );
};

