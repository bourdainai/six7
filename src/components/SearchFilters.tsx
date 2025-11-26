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
import { logger } from "@/lib/logger";

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
  subcategory: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  setCode: string;
  rarity: string;
  tradeEnabled: string;
  freeShipping: string;
  maxDeliveryDays: string;
}

const CATEGORIES = [
  "Trading Cards",
  "Sealed Products",
  "Accessories",
  "Collectibles",
  "Other"
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Trading Cards": ["Single Cards", "Graded Cards", "PSA Slabs", "CGC Slabs", "BGS Slabs"],
  "Sealed Products": ["Booster Boxes", "Booster Packs", "ETBs", "Collection Boxes", "Tins"],
  "Accessories": ["Sleeves", "Binders", "Deck Boxes", "Playmats", "Card Cases"],
  "Collectibles": ["Figures", "Plushies", "Keychains", "Pins", "Merchandise"],
  "Other": ["Bulk Lots", "Damaged Cards", "Promotional Items"]
};

const CONDITIONS = [
  "new_with_tags",
  "like_new",
  "excellent",
  "good",
  "fair"
];

const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Ultra",
  "Rare Secret",
  "Rare Rainbow",
  "Rare Shiny"
];

const COLORS = [
  "Black", "White", "Red", "Blue", "Green", "Yellow",
  "Purple", "Pink", "Orange", "Brown", "Grey", "Multi-Color"
];

const MATERIALS = [
  "Cardboard", "Plastic", "Metal", "Fabric",
  "Acrylic", "Wood", "Rubber", "Mixed Materials"
];

import { useMobileDetect } from "@/hooks/useMobileDetect";

// ... existing imports ...

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
  const { isMobile } = useMobileDetect();

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
      logger.error("Search error:", error);
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
          <div className="flex items-center pl-1 sm:pl-2 border-r border-border/50">
            <Select
              value={searchMode}
              onValueChange={(val: 'browse' | 'semantic' | 'vibe') => {
                setSearchMode(val);
                if (val === 'vibe') onVibeSearchClick?.();
              }}
            >
              <SelectTrigger className="w-[36px] sm:w-[130px] border-0 focus:ring-0 shadow-none bg-transparent hover:bg-secondary/50 rounded-lg transition-colors gap-2">
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
                ? "Ask AI anything..."
                : "Search for cards, sets, or other..."
            }
            value={localFilters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 h-14 border-0 focus-visible:ring-0 bg-transparent text-base px-2 sm:px-4 shadow-none placeholder:text-muted-foreground/50"
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
              <SheetContent
                side={isMobile ? "bottom" : "right"}
                className={isMobile ? "h-[85vh] rounded-t-2xl px-4" : "w-[350px] sm:w-[450px] border-l border-border overflow-y-auto"}
              >
                <SheetHeader className={isMobile ? "text-left" : ""}>
                  <SheetTitle>Advanced Filters</SheetTitle>
                  <SheetDescription>
                    {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 'Refine your search'}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                  {/* Category & Subcategory */}
                  <div className="space-y-4 pb-4 border-b border-border">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Category</Label>
                      <Select
                        value={localFilters.category || "all"}
                        onValueChange={(v) => {
                          updateFilter("category", v === "all" ? "" : v);
                          updateFilter("subcategory", ""); // Reset subcategory
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {localFilters.category && SUBCATEGORIES[localFilters.category] && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Subcategory</Label>
                        <Select
                          value={localFilters.subcategory || "all"}
                          onValueChange={(v) => updateFilter("subcategory", v === "all" ? "" : v)}
                        >
                          <SelectTrigger><SelectValue placeholder="All Subcategories" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subcategories</SelectItem>
                            {SUBCATEGORIES[localFilters.category].map(sc => (
                              <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Trading Card Specific Filters */}
                  {localFilters.category === "Trading Cards" && (
                    <div className="space-y-4 pb-4 border-b border-border">
                      <h3 className="text-sm font-semibold text-primary">Card Details</h3>

                      <div className="space-y-2">
                        <Label className="text-sm">Rarity</Label>
                        <Select
                          value={localFilters.rarity || "all"}
                          onValueChange={(v) => updateFilter("rarity", v === "all" ? "" : v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Any Rarity" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Rarity</SelectItem>
                            {RARITIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Set Code</Label>
                        <Input
                          placeholder="e.g., SV04, BASE, etc."
                          value={localFilters.setCode}
                          onChange={(e) => updateFilter("setCode", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Price & Condition */}
                  <div className="space-y-4 pb-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-primary">Price & Condition</h3>

                    <div className="space-y-2">
                      <Label className="text-sm">Condition</Label>
                      <Select
                        value={localFilters.condition || "all"}
                        onValueChange={(v) => updateFilter("condition", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Condition" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Condition</SelectItem>
                          {CONDITIONS.map(c => (
                            <SelectItem key={c} value={c}>{formatCondition(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Price Range (£)</Label>
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
                  </div>

                  {/* Product Attributes */}
                  <div className="space-y-4 pb-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-primary">Product Details</h3>

                    <div className="space-y-2">
                      <Label className="text-sm">Brand</Label>
                      <Input
                        placeholder="e.g., Pokémon, Ultra Pro"
                        value={localFilters.brand}
                        onChange={(e) => updateFilter("brand", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Color</Label>
                      <Select
                        value={localFilters.color || "all"}
                        onValueChange={(v) => updateFilter("color", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Color" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Color</SelectItem>
                          {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Material</Label>
                      <Select
                        value={localFilters.material || "all"}
                        onValueChange={(v) => updateFilter("material", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Material" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Material</SelectItem>
                          {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Size</Label>
                      <Input
                        placeholder="e.g., Standard, Large, XL"
                        value={localFilters.size}
                        onChange={(e) => updateFilter("size", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Shipping & Delivery */}
                  <div className="space-y-4 pb-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-primary">Shipping & Delivery</h3>

                    <div className="space-y-2">
                      <Label className="text-sm">Shipping</Label>
                      <Select
                        value={localFilters.freeShipping || "all"}
                        onValueChange={(v) => updateFilter("freeShipping", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Shipping" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Shipping</SelectItem>
                          <SelectItem value="true">Free Shipping Only</SelectItem>
                          <SelectItem value="false">Paid Shipping</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max Delivery Time (days)</Label>
                      <Select
                        value={localFilters.maxDeliveryDays || "all"}
                        onValueChange={(v) => updateFilter("maxDeliveryDays", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Delivery Time" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Delivery Time</SelectItem>
                          <SelectItem value="1">1 Day</SelectItem>
                          <SelectItem value="2">2 Days</SelectItem>
                          <SelectItem value="3">3 Days</SelectItem>
                          <SelectItem value="5">5 Days</SelectItem>
                          <SelectItem value="7">1 Week</SelectItem>
                          <SelectItem value="14">2 Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Trading Options */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary">Trading</h3>

                    <div className="space-y-2">
                      <Label className="text-sm">Trade Options</Label>
                      <Select
                        value={localFilters.tradeEnabled || "all"}
                        onValueChange={(v) => updateFilter("tradeEnabled", v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Buy or Trade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Buy or Trade</SelectItem>
                          <SelectItem value="true">Trade Offers Accepted</SelectItem>
                          <SelectItem value="false">Buy Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-2">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>
                      Reset All
                    </Button>
                    <Button className="flex-1" onClick={() => setIsOpen(false)}>
                      Apply Filters
                    </Button>
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
        </div >

        {/* Autocomplete Dropdown */}
        {
          showSuggestions && suggestions.length > 0 && (
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
          )
        }
      </div >

      {/* Active Filter Badges */}
      {
        activeFilterCount > 0 && (
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
        )
      }
    </div >
  );
};
