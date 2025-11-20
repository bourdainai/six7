import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, SlidersHorizontal, X, Sparkles, Image, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { formatCondition } from "@/lib/format";
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
  "Pokémon Singles",
  "Pokémon Sealed",
  "Graded Cards",
  "Raw Cards",
  "Accessories",
];

const CONDITIONS = [
  "All Conditions",
  "new_with_tags",
  "like_new",
  "excellent",
  "good",
  "fair"
];

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
          body: { query, limit: 5 }
        });

        if (error) throw error;
        setSuggestions(data.suggestions || []);
      } catch (error) {
        // Silent fail for autocomplete
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
    
    if (searchMode === 'browse') {
      onFilterChange(newFilters);
    }
  };

  const handleSearch = async () => {
    if (!localFilters.search?.trim() && searchMode !== 'vibe') {
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);

    try {
      if (searchMode === 'semantic') {
        onSearchTypeChange?.('semantic');
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: { query: localFilters.search.trim(), limit: 50 }
        });
        if (error) throw error;
        onSemanticSearch?.(data.results || []);
      } else {
        // Regular keyword search handled by parent Browse component via onFilterChange
        onFilterChange(localFilters);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
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

  const activeFilterCount = Object.entries(localFilters).filter(
    ([key, value]) => key !== 'search' && value && value !== ''
  ).length;

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 relative z-20">
      {/* Magical Search Bar Container */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        <div className="relative flex items-center bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300">
          
          {/* Search Mode Selector (Subtle) */}
          <div className="flex items-center pl-2 border-r border-border/50">
            <Select 
              value={searchMode} 
              onValueChange={(val: any) => {
                setSearchMode(val);
                if(val === 'vibe') onVibeSearchClick?.();
              }}
            >
              <SelectTrigger className="w-[50px] sm:w-[130px] border-0 focus:ring-0 shadow-none bg-transparent hover:bg-secondary/50 rounded-lg transition-colors gap-2">
                {searchMode === 'browse' && <Search className="h-4 w-4 text-muted-foreground" />}
                {searchMode === 'semantic' && <Sparkles className="h-4 w-4 text-purple-500" />}
                {searchMode === 'vibe' && <Image className="h-4 w-4 text-pink-500" />}
                <span className="hidden sm:inline text-sm font-medium text-muted-foreground">
                  {searchMode === 'browse' ? 'Keyword' : searchMode === 'semantic' ? 'AI Ask' : 'Vibe'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browse">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" /> <span>Keyword</span>
                  </div>
                </SelectItem>
                <SelectItem value="semantic">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" /> <span>AI Ask</span>
                  </div>
                </SelectItem>
                <SelectItem value="vibe">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-pink-500" /> <span>Vibe Search</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Input */}
          <Input
            ref={searchInputRef}
            placeholder={
              searchMode === 'semantic' 
                ? "Ask for anything... (e.g. 'mint charizard under £50')" 
                : "Search for cards, sets, or sealed product..."
            }
            value={localFilters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 h-14 border-0 focus-visible:ring-0 bg-transparent text-base px-4 shadow-none placeholder:text-muted-foreground/50"
          />

          {/* Actions Right */}
          <div className="flex items-center pr-2 gap-1">
            {/* Filter Trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[350px] sm:w-[400px] border-l border-border">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Narrow down your search results.</SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={localFilters.category || "all"} 
                      onValueChange={(v) => updateFilter("category", v === "all" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select 
                      value={localFilters.condition || "all"} 
                      onValueChange={(v) => updateFilter("condition", v === "all" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Any Condition" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Condition</SelectItem>
                        {CONDITIONS.map(c => (
                          <SelectItem key={c} value={c}>{c === "All Conditions" ? "All" : formatCondition(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Price Range (£)</Label>
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

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>Reset</Button>
                    <Button className="flex-1" onClick={() => setIsOpen(false)}>Show Results</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Search Button */}
            <Button 
              onClick={handleSearch}
              size="icon"
              disabled={isSearching}
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <Command>
              <CommandList>
                <CommandGroup heading="Suggestions">
                  {suggestions.map((s, i) => (
                    <CommandItem 
                      key={i} 
                      onSelect={() => {
                        updateFilter("search", s.text);
                        setShowSuggestions(false);
                        handleSearch();
                      }}
                      className="cursor-pointer"
                    >
                      <span className="mr-2 text-lg">{s.icon}</span>
                      <span>{s.text}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center animate-in fade-in slide-in-from-top-2">
          {Object.entries(localFilters).map(([key, value]) => {
            if (!value || key === 'search') return null;
            return (
              <Badge key={key} variant="secondary" className="pl-2 pr-1 py-1 bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <span className="capitalize mr-1 text-muted-foreground">{key}:</span>
                <span className="font-medium">{value}</span>
                <button 
                  onClick={() => updateFilter(key as keyof FilterState, "")}
                  className="ml-2 hover:bg-background/50 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
