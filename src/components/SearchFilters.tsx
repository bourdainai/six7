import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, SlidersHorizontal, X, Sparkles, Image, History, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { formatCondition } from "@/lib/format";
import { SearchHistoryPanel } from "@/components/SearchHistoryPanel";
import { SavedSearchesPanel } from "@/components/SavedSearchesPanel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import type { ListingSummary } from "@/types/listings";

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  activeFilters: FilterState;
  onSemanticSearch?: (results: ListingSummary[]) => void;
  onSearchTypeChange?: (type: 'browse' | 'semantic') => void;
  onVibeSearchClick?: () => void;
}

export interface FilterState {
  search: string;
  category: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  brand: string;
  size: string;
}

const CATEGORIES = [
  "All Categories",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Shoes",
  "Accessories"
];

const CONDITIONS = [
  "All Conditions",
  "new_with_tags",
  "like_new",
  "excellent",
  "good",
  "fair"
];

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SearchFilters = ({ 
  onFilterChange, 
  activeFilters,
  onSemanticSearch,
  onSearchTypeChange,
  onVibeSearchClick
}: SearchFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);
  const [isOpen, setIsOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'browse' | 'semantic' | 'vibe'>('browse');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; text: string; icon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      const query = localFilters.search?.trim();
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-autocomplete', {
          body: { query, limit: 8 }
        });

        if (error) throw error;
        setSuggestions(data.suggestions || []);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Autocomplete error:', error);
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [localFilters.search]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // If in browse mode, apply filters immediately
    if (searchMode === 'browse') {
      onFilterChange(newFilters);
    }
  };

    interface SemanticSearchResponse {
      routeTo?: "keyword" | "semantic";
      results?: ListingSummary[];
    }

    const handleSemanticSearch = async () => {
    if (!localFilters.search?.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    onSearchTypeChange?.('semantic');

    try {
        const { data, error } = await supabase.functions.invoke<SemanticSearchResponse>('semantic-search', {
        body: { 
          query: localFilters.search.trim(), 
          filters: {
            category: localFilters.category,
            condition: localFilters.condition,
            minPrice: localFilters.minPrice,
            maxPrice: localFilters.maxPrice,
            brand: localFilters.brand,
            size: localFilters.size,
          },
          limit: 50,
          forceMode: 'semantic'
        }
      });

        if (error) throw error;

      // Check if we should route to keyword search instead
      if (data.routeTo === 'keyword') {
        await handleKeywordSearch();
        return;
      }

        onSemanticSearch?.(data.results || []);
      
      toast({
        title: "AI Search Complete",
        description: `Found ${data.results?.length || 0} items matching "${localFilters.search}"`,
      });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please try again";
      if (import.meta.env.DEV) {
        console.error("Search error:", error);
      }
      toast({
        title: "Search Failed",
          description: message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeywordSearch = async () => {
    if (!localFilters.search?.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    onSearchTypeChange?.('semantic');

    try {
        const { data, error } = await supabase.functions.invoke<SemanticSearchResponse>('keyword-search', {
        body: { 
          query: localFilters.search.trim(),
          filters: {
            category: localFilters.category,
            condition: localFilters.condition,
            minPrice: localFilters.minPrice,
            maxPrice: localFilters.maxPrice,
            brand: localFilters.brand,
            size: localFilters.size,
          },
          limit: 50
        }
      });

      if (error) throw error;

        onSemanticSearch?.(data.results || []);
      
      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} results`,
      });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please try again";
      if (import.meta.env.DEV) {
        console.error("Keyword search error:", error);
      }
      toast({
        title: "Search Failed",
          description: message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchModeChange = (mode: 'browse' | 'semantic' | 'vibe') => {
    setSearchMode(mode);
    if (mode === 'browse') {
      onFilterChange(localFilters);
      onSearchTypeChange?.('browse');
    } else if (mode === 'vibe') {
      onVibeSearchClick?.();
    }
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      search: "",
      category: "",
      condition: "",
      minPrice: "",
      maxPrice: "",
      brand: "",
      size: "",
    };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setIsOpen(false);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const activeFilterCount = Object.entries(localFilters).filter(
    ([key, value]) => key !== 'search' && value && value !== ''
  ).length;

  return (
    <div className="w-full space-y-6 mb-8">
      {/* Search Mode Pills */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => handleSearchModeChange('browse')}
          className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
            searchMode === 'browse'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
              : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 hover:scale-105'
          }`}
        >
          <Search className="inline-block mr-2 h-4 w-4" />
          Keyword Search
        </button>
        <button
          onClick={() => handleSearchModeChange('semantic')}
          className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
            searchMode === 'semantic'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
              : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 hover:scale-105'
          }`}
        >
          <Sparkles className="inline-block mr-2 h-4 w-4" />
          AI Search
        </button>
        <button
          onClick={() => handleSearchModeChange('vibe')}
          className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
            searchMode === 'vibe'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
              : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 hover:scale-105'
          }`}
        >
          <Image className="inline-block mr-2 h-4 w-4" />
          Vibe Search
        </button>
      </div>

      {/* Main Search Bar */}
      <div className="relative max-w-4xl mx-auto">
        <div className="relative backdrop-blur-xl bg-background/50 rounded-3xl shadow-2xl border border-border/30 hover:shadow-primary/10 transition-all duration-300 overflow-visible">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors z-10" />
            <Input
              ref={searchInputRef}
              placeholder={
                searchMode === 'semantic' 
                  ? "Describe what you're looking for..." 
                  : searchMode === 'vibe'
                  ? "Search by vibe or mood..."
                  : "Search listings..."
              }
              value={localFilters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (searchMode === 'semantic') {
                    handleSemanticSearch();
                  } else {
                    handleKeywordSearch();
                  }
                }
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              className="pl-12 pr-56 h-14 bg-transparent backdrop-blur-md border-0 hover:bg-background/10 focus:bg-background/20 transition-all text-base"
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <Command>
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                      {isLoadingSuggestions ? "Loading suggestions..." : "No suggestions found"}
                    </CommandEmpty>
                    <CommandGroup>
                      {suggestions.map((suggestion, index) => (
                        <CommandItem
                          key={`${suggestion.type}-${index}`}
                          onSelect={() => {
                            updateFilter("search", suggestion.text);
                            setShowSuggestions(false);
                            if (searchMode === 'semantic') {
                              handleSemanticSearch();
                            } else {
                              handleKeywordSearch();
                            }
                          }}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <span className="text-lg">{suggestion.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{suggestion.text}</div>
                            <div className="text-xs text-muted-foreground capitalize">{suggestion.type}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}

            <Button
              onClick={searchMode === 'semantic' ? handleSemanticSearch : handleKeywordSearch}
              disabled={isSearching || !localFilters.search?.trim()}
              className="absolute right-32 top-1/2 -translate-y-1/2 h-10 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl z-10"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  {searchMode === 'semantic' ? <Sparkles className="h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </>
              )}
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 hover:bg-accent/50 rounded-xl z-10"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Filter Results</SheetTitle>
                  <SheetDescription>
                    Refine your search with these filters
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={localFilters.category}
                      onValueChange={(value) => updateFilter("category", value === "All Categories" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select
                      value={localFilters.condition}
                      onValueChange={(value) => updateFilter("condition", value === "All Conditions" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((cond) => (
                          <SelectItem key={cond} value={cond}>
                            {cond === "All Conditions" ? cond : formatCondition(cond)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={localFilters.minPrice}
                        onChange={(e) => updateFilter("minPrice", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={localFilters.maxPrice}
                        onChange={(e) => updateFilter("maxPrice", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      placeholder="Search by brand"
                      value={localFilters.brand}
                      onChange={(e) => updateFilter("brand", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Size</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SIZES.map((size) => (
                        <Badge
                          key={size}
                          variant={localFilters.size === size ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => updateFilter("size", localFilters.size === size ? "" : size)}
                        >
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Clear All
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={applyFilters}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Search History & Saved Searches */}
      <div className="flex gap-2 justify-center mt-4">
        <Popover open={showHistory} onOpenChange={setShowHistory}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="center">
            <SearchHistoryPanel
              onSelectSearch={(query) => {
                updateFilter("search", query);
                setShowHistory(false);
                if (searchMode === 'semantic') {
                  handleSemanticSearch();
                } else {
                  handleKeywordSearch();
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Popover open={showSavedSearches} onOpenChange={setShowSavedSearches}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              Saved
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="center">
            <SavedSearchesPanel
              currentQuery={localFilters.search}
              currentFilters={{
                category: localFilters.category,
                minPrice: localFilters.minPrice,
                maxPrice: localFilters.maxPrice,
                condition: localFilters.condition,
                search: localFilters.search,
                brand: localFilters.brand,
                size: localFilters.size,
              } as any}
              onSelectSearch={(query, savedFilters) => {
                updateFilter("search", query);
                if (savedFilters) {
                  setLocalFilters((prev) => ({ ...prev, ...savedFilters }));
                }
                setShowSavedSearches(false);
                if (searchMode === 'semantic') {
                  handleSemanticSearch();
                } else {
                  handleKeywordSearch();
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(localFilters).map(([key, value]) => {
            if (key === 'search' || !value) return null;
            return (
              <Badge key={key} variant="secondary" className="px-3 py-1.5">
                {key}: {value}
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                  onClick={() => updateFilter(key as keyof FilterState, "")}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
