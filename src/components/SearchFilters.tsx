import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, SlidersHorizontal, X, Sparkles, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  activeFilters: FilterState;
  onSemanticSearch?: (results: any[]) => void;
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
  const [searchMode, setSearchMode] = useState<'browse' | 'semantic'>('semantic');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // If in browse mode, apply filters immediately
    if (searchMode === 'browse') {
      onFilterChange(newFilters);
    }
  };

  const handleSemanticSearch = async () => {
    if (!localFilters.search.trim()) return;

    setIsSearching(true);
    onSearchTypeChange?.('semantic');

    try {
      if (searchMode === 'semantic') {
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: { query: localFilters.search.trim(), limit: 40 }
        });

        if (error) throw error;
        
        onSemanticSearch?.(data.results || []);
        
        toast({
          title: "AI Search Complete",
          description: `Found ${data.results?.length || 0} items matching "${localFilters.search}"`,
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

  const handleSearchModeChange = (mode: 'browse' | 'semantic') => {
    setSearchMode(mode);
    if (mode === 'browse') {
      onFilterChange(localFilters);
      onSearchTypeChange?.('browse');
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
    ([key, value]) => key !== "search" && value !== ""
  ).length;

  return (
    <div className="w-full space-y-6">
      {/* Search Mode Pills */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleSearchModeChange('browse')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            searchMode === 'browse'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Keyword Search
        </button>
        <button
          onClick={() => handleSearchModeChange('semantic')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            searchMode === 'semantic'
              ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Search
        </button>
        {onVibeSearchClick && (
          <button
            onClick={onVibeSearchClick}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 bg-muted/50 text-muted-foreground hover:bg-muted"
          >
            <Image className="w-4 h-4" />
            Vibe Search
          </button>
        )}
      </div>

      {/* Main Search Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder={
                searchMode === 'semantic' 
                  ? "Describe what you're looking for... (e.g., 'cozy oversized sweater for winter')"
                  : "Search by keyword, brand, or item..."
              }
              value={localFilters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchMode === 'semantic' && localFilters.search) {
                  handleSemanticSearch();
                }
              }}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            <div className="flex items-center gap-2">
              {searchMode === 'semantic' && (
                <Button 
                  onClick={handleSemanticSearch} 
                  disabled={!localFilters.search || isSearching}
                  className="rounded-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              )}
              
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2 relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search with these filters
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    {/* Category Filter */}
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

                    {/* Condition Filter */}
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
                              {cond.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-3">
                      <Label>Price Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Min</Label>
                          <Input
                            type="number"
                            placeholder="£0"
                            value={localFilters.minPrice}
                            onChange={(e) => updateFilter("minPrice", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max</Label>
                          <Input
                            type="number"
                            placeholder="£1000"
                            value={localFilters.maxPrice}
                            onChange={(e) => updateFilter("maxPrice", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input
                        type="text"
                        placeholder="Enter brand name"
                        value={localFilters.brand}
                        onChange={(e) => updateFilter("brand", e.target.value)}
                      />
                    </div>

                    {/* Size */}
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_SIZES.map((size) => (
                          <Badge
                            key={size}
                            variant={localFilters.size === size ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() =>
                              updateFilter("size", localFilters.size === size ? "" : size)
                            }
                          >
                            {size}
                          </Badge>
                        ))}
                      </div>
                      <Input
                        type="text"
                        placeholder="Or enter custom size"
                        value={localFilters.size && !COMMON_SIZES.includes(localFilters.size) ? localFilters.size : ""}
                        onChange={(e) => updateFilter("size", e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={clearFilters} className="flex-1">
                        Clear All
                      </Button>
                      <Button onClick={applyFilters} className="flex-1">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Helper Text */}
          {searchMode === 'semantic' && (
            <div className="px-4 pb-3 pt-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                AI understands context and meaning - describe the vibe, style, or feeling you want
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {localFilters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {localFilters.category}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("category", "")}
              />
            </Badge>
          )}
          {localFilters.condition && (
            <Badge variant="secondary" className="gap-1">
              Condition: {localFilters.condition.replace(/_/g, " ")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("condition", "")}
              />
            </Badge>
          )}
          {localFilters.minPrice && (
            <Badge variant="secondary" className="gap-1">
              Min: £{localFilters.minPrice}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("minPrice", "")}
              />
            </Badge>
          )}
          {localFilters.maxPrice && (
            <Badge variant="secondary" className="gap-1">
              Max: £{localFilters.maxPrice}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("maxPrice", "")}
              />
            </Badge>
          )}
          {localFilters.brand && (
            <Badge variant="secondary" className="gap-1">
              Brand: {localFilters.brand}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("brand", "")}
              />
            </Badge>
          )}
          {localFilters.size && (
            <Badge variant="secondary" className="gap-1">
              Size: {localFilters.size}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("size", "")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
