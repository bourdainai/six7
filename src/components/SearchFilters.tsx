import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
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

export const SearchFilters = ({ onFilterChange, activeFilters }: SearchFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
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
  };

  const activeFilterCount = Object.values(localFilters).filter(v => v && v !== "").length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, brand, or description..."
            value={localFilters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Results</SheetTitle>
              <SheetDescription>
                Narrow down your search with these filters
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Category */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Category</Label>
                <Select
                  value={localFilters.category}
                  onValueChange={(value) => updateFilter("category", value === "All Categories" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
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

              {/* Condition */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Condition</Label>
                <Select
                  value={localFilters.condition}
                  onValueChange={(value) => updateFilter("condition", value === "All Conditions" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Conditions" />
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
              <div>
                <Label className="text-sm font-medium mb-2 block">Price Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min £"
                    value={localFilters.minPrice}
                    onChange={(e) => updateFilter("minPrice", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max £"
                    value={localFilters.maxPrice}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Size</Label>
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
                <Input
                  className="mt-2"
                  placeholder="Or enter custom size"
                  value={localFilters.size && !COMMON_SIZES.includes(localFilters.size) ? localFilters.size : ""}
                  onChange={(e) => updateFilter("size", e.target.value)}
                />
              </div>

              {/* Brand */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Brand</Label>
                <Input
                  placeholder="Enter brand name"
                  value={localFilters.brand}
                  onChange={(e) => updateFilter("brand", e.target.value)}
                />
              </div>

              {/* Actions */}
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
                  onClick={() => setIsOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {localFilters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {localFilters.category}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("category", "")}
              />
            </Badge>
          )}
          
          {localFilters.condition && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {localFilters.condition.replace(/_/g, " ")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("condition", "")}
              />
            </Badge>
          )}
          
          {(localFilters.minPrice || localFilters.maxPrice) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              £{localFilters.minPrice || "0"} - £{localFilters.maxPrice || "∞"}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => {
                  updateFilter("minPrice", "");
                  updateFilter("maxPrice", "");
                }}
              />
            </Badge>
          )}
          
          {localFilters.size && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Size: {localFilters.size}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("size", "")}
              />
            </Badge>
          )}
          
          {localFilters.brand && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {localFilters.brand}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("brand", "")}
              />
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
