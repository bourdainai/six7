import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SemanticSearchBarProps {
  onResults: (results: any[]) => void;
  onSearchTypeChange?: (type: 'text' | 'semantic' | 'vibe') => void;
}

export const SemanticSearchBar = ({ onResults, onSearchTypeChange }: SemanticSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'text' | 'semantic'>('semantic');
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    onSearchTypeChange?.(searchType);

    try {
      if (searchType === 'semantic') {
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: { query: query.trim(), limit: 40 }
        });

        if (error) throw error;
        
        onResults(data.results || []);
        
        toast({
          title: "AI Search Complete",
          description: `Found ${data.results?.length || 0} items matching "${query}"`,
        });
      } else {
        // Fallback to text search
        const { data, error } = await supabase
          .from('listings')
          .select('*, listing_images(image_url)')
          .eq('status', 'active')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(40);

        if (error) throw error;
        
        onResults(data || []);
        
        toast({
          title: "Search Complete",
          description: `Found ${data?.length || 0} items`,
        });
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchType === 'semantic' 
              ? "Describe what you're looking for... (e.g., 'cozy oversized sweater for winter')" 
              : "Search by keyword..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={!query.trim() || isSearching}
          className="gap-2"
        >
          {searchType === 'semantic' && <Sparkles className="h-4 w-4" />}
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Search mode:</span>
        <button
          onClick={() => setSearchType('semantic')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            searchType === 'semantic'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Sparkles className="inline h-3 w-3 mr-1" />
          AI Semantic
        </button>
        <button
          onClick={() => setSearchType('text')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            searchType === 'text'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Search className="inline h-3 w-3 mr-1" />
          Keyword
        </button>
      </div>

      {searchType === 'semantic' && (
        <p className="text-xs text-muted-foreground">
          💡 AI understands context and meaning - describe the vibe, style, or feeling you want
        </p>
      )}
    </div>
  );
};
