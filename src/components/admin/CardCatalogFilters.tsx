import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";
import { CardCatalogFilters as FilterType, useCardSets, useCardRarities } from "@/hooks/useCardCatalog";

interface CardCatalogFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function CardCatalogFilters({ filters, onFiltersChange }: CardCatalogFiltersProps) {
  const { data: sets, isLoading: setsLoading } = useCardSets();
  const { data: rarities, isLoading: raritiesLoading } = useCardRarities();

  const updateFilter = (key: keyof FilterType, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs ml-auto"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or number..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value || undefined)}
            className="pl-9"
          />
        </div>

        {/* Language */}
        <Select
          value={filters.language || "all"}
          onValueChange={(value) => updateFilter("language", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="japanese">Japanese</SelectItem>
          </SelectContent>
        </Select>

        {/* Set */}
        <Select
          value={filters.setCode || "all"}
          onValueChange={(value) => updateFilter("setCode", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Set" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Sets</SelectItem>
            {!setsLoading &&
              sets?.map((set) => (
                <SelectItem key={set.code} value={set.code}>
                  {set.name} ({set.code})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Data Status */}
        <Select
          value={filters.dataStatus || "all"}
          onValueChange={(value) => updateFilter("dataStatus", value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Data Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="missing_images">Missing Images</SelectItem>
            <SelectItem value="missing_prices">Missing Prices</SelectItem>
            <SelectItem value="complete">Complete Data</SelectItem>
          </SelectContent>
        </Select>

        {/* Sync Source */}
        <Select
          value={filters.syncSource || "all"}
          onValueChange={(value) => updateFilter("syncSource", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="tcgdex">TCGdex</SelectItem>
            <SelectItem value="tcgdex_github">TCGdex GitHub</SelectItem>
            <SelectItem value="on_demand">On Demand</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Second row - Rarity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Select
          value={filters.rarity || "all"}
          onValueChange={(value) => updateFilter("rarity", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Rarities</SelectItem>
            {!raritiesLoading &&
              rarities?.map((rarity) => (
                <SelectItem key={rarity} value={rarity}>
                  {rarity}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

