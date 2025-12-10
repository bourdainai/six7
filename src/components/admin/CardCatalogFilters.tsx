import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, ArrowUpDown, RefreshCw, Clock } from "lucide-react";
import { CardCatalogFilters as FilterType, useCardSets, useCardRarities, SortOption } from "@/hooks/useCardCatalog";

interface CardCatalogFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function CardCatalogFilters({ filters, onFiltersChange, onRefresh, isRefreshing }: CardCatalogFiltersProps) {
  const { data: sets, isLoading: setsLoading, dataUpdatedAt } = useCardSets();
  const { data: rarities, isLoading: raritiesLoading } = useCardRarities();

  const updateFilter = (key: keyof FilterType, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({ sortBy: filters.sortBy }); // Keep sort when clearing
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, v]) => key !== "sortBy" && v !== undefined && v !== ""
  );

  // Group sets by recently synced vs older
  const recentSets = sets?.filter((s) => {
    if (!s.lastSynced) return false;
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return new Date(s.lastSynced).getTime() > hourAgo;
  }) || [];

  const olderSets = sets?.filter((s) => {
    if (!s.lastSynced) return true;
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return new Date(s.lastSynced).getTime() <= hourAgo;
  }) || [];

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters & Sorting</span>
        {sets && (
          <Badge variant="outline" className="ml-2">
            {sets.length} sets loaded
          </Badge>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dataUpdatedAt && (
            <span className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
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

        {/* Sort By */}
        <Select
          value={filters.sortBy || "synced_newest"}
          onValueChange={(value) => updateFilter("sortBy", value as SortOption)}
        >
          <SelectTrigger>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>By Sync Date</SelectLabel>
              <SelectItem value="synced_newest">Recently Synced First</SelectItem>
              <SelectItem value="synced_oldest">Oldest Synced First</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>By Created Date</SelectLabel>
              <SelectItem value="created_newest">Newest Created First</SelectItem>
              <SelectItem value="created_oldest">Oldest Created First</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>By Name</SelectLabel>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>By Set</SelectLabel>
              <SelectItem value="set_number">Set & Number</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

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
          <SelectContent className="max-h-[400px]">
            <SelectItem value="all">All Sets ({sets?.reduce((sum, s) => sum + s.cardCount, 0)?.toLocaleString() || 0} cards)</SelectItem>
            
            {recentSets.length > 0 && (
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1 text-green-600">
                  <Clock className="h-3 w-3" />
                  Recently Imported (last hour)
                </SelectLabel>
                {recentSets.map((set) => (
                  <SelectItem key={set.code} value={set.code}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{set.name}</span>
                      <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                        {set.cardCount}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {olderSets.length > 0 && (
              <SelectGroup>
                <SelectLabel>All Sets</SelectLabel>
                {olderSets.map((set) => (
                  <SelectItem key={set.code} value={set.code}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{set.name}</span>
                      <Badge variant="outline" className="text-xs ml-2 shrink-0">
                        {set.cardCount}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {setsLoading && (
              <SelectItem value="loading" disabled>
                Loading sets...
              </SelectItem>
            )}
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
            <SelectItem value="missing_english">Missing English Names (JP)</SelectItem>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
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

