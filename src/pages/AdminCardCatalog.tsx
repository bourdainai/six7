import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CardCatalogFilters } from "@/components/admin/CardCatalogFilters";
import { CardCatalogGrid } from "@/components/admin/CardCatalogGrid";
import {
  useCardCatalog,
  useCardCatalogStats,
  CardCatalogFilters as FilterType,
} from "@/hooks/useCardCatalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Image,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = "default",
}: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-muted/50",
    success: "bg-green-500/10 border-green-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    danger: "bg-red-500/10 border-red-500/20",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
  };

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
            <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsSection() {
  const { data: stats, isLoading, refetch, isRefetching } = useCardCatalogStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-16" />
          </Card>
        ))}
      </div>
    );
  }

  const imageCoverage = stats ? Math.round((stats.withImages / stats.total) * 100) : 0;
  const priceCoverage = stats ? Math.round((stats.withPrices / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Data Quality Overview</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={Database}
          label="Total Cards"
          value={stats?.total || 0}
          variant="default"
        />
        <StatsCard
          icon={Image}
          label="With Images"
          value={stats?.withImages || 0}
          subValue={`${imageCoverage}% coverage`}
          variant={imageCoverage > 95 ? "success" : imageCoverage > 80 ? "warning" : "danger"}
        />
        <StatsCard
          icon={AlertTriangle}
          label="Missing Images"
          value={stats?.missingImages || 0}
          variant={stats?.missingImages === 0 ? "success" : "danger"}
        />
        <StatsCard
          icon={DollarSign}
          label="With Prices"
          value={stats?.withPrices || 0}
          subValue={`${priceCoverage}% coverage`}
          variant={priceCoverage > 50 ? "success" : priceCoverage > 20 ? "warning" : "danger"}
        />
      </div>

      {/* Sync Source Breakdown */}
      {stats?.bySyncSource && Object.keys(stats.bySyncSource).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">By Source:</span>
          {Object.entries(stats.bySyncSource).map(([source, count]) => (
            <Badge key={source} variant="outline" className="text-xs">
              {source}: {(count as number).toLocaleString()}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCardCatalog() {
  const [filters, setFilters] = useState<FilterType>({});
  const [page, setPage] = useState(0);

  const { data, isLoading } = useCardCatalog({
    filters,
    page,
    pageSize: 50,
  });

  // Reset page when filters change
  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Card Catalog
              </h1>
              <p className="text-sm text-muted-foreground">
                Browse and inspect all Pokemon cards in the database
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsSection />

        {/* Filters */}
        <CardCatalogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Results Count */}
        {data && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {data.totalCount.toLocaleString()} cards found
            </Badge>
            {filters.dataStatus === "missing_images" && (
              <Badge variant="destructive">Showing cards with missing images</Badge>
            )}
            {filters.dataStatus === "missing_prices" && (
              <Badge className="bg-yellow-500/20 text-yellow-600">
                Showing cards without price data
              </Badge>
            )}
          </div>
        )}

        {/* Card Grid */}
        <CardCatalogGrid
          cards={data?.cards || []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.totalPages || 0}
          totalCount={data?.totalCount || 0}
          onPageChange={setPage}
        />
      </div>
    </AdminLayout>
  );
}

