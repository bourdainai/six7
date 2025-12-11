import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CardCatalogFilters } from "@/components/admin/CardCatalogFilters";
import { CardCatalogGrid } from "@/components/admin/CardCatalogGrid";
import { DuplicateCleanupModal } from "@/components/admin/DuplicateCleanupModal";
import {
  useCardCatalog,
  useCardCatalogStats,
  useDuplicateDetection,
  CardCatalogFilters as FilterType,
} from "@/hooks/useCardCatalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Database,
  Image,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Copy,
  Globe,
  Download,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = "default",
}: {
  icon: LucideIcon;
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
  // Default to showing recently synced cards first
  const [filters, setFilters] = useState<FilterType>({ sortBy: "synced_newest" });
  const [page, setPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isRunningEnglishNames, setIsRunningEnglishNames] = useState(false);
  const [isRunningImages, setIsRunningImages] = useState(false);
  const [englishNamesProgress, setEnglishNamesProgress] = useState({ processed: 0, updated: 0 });
  const [imagesProgress, setImagesProgress] = useState({ processed: 0, updated: 0 });
  const { toast } = useToast();

  const { data, isLoading, refetch } = useCardCatalog({
    filters,
    page,
    pageSize: 50,
  });

  // Check for duplicates
  const { data: duplicateData, isLoading: duplicatesLoading } = useDuplicateDetection();

  // Bulk action mutations
  const validateImagesMutation = useMutation({
    mutationFn: async ({ validateAll = false }: { validateAll?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('validate-card-images', {
        body: { validateAll, batchSize: 100 }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Image Validation Complete",
        description: data.message || `Validated ${data.stats?.validated || 0} images`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate images",
        variant: "destructive",
      });
    },
  });

  const fetchEnglishNamesMutation = useMutation({
    mutationFn: async ({ limit = 100 }: { limit?: number }) => {
      const { data, error } = await supabase.functions.invoke('backfill-english-names', {
        body: { batchSize: 50, limit }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "English Names Fetched",
        description: data.message || `Updated ${data.stats?.updated || 0} cards`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to fetch English names",
        variant: "destructive",
      });
    },
  });

  const fetchImagesMutation = useMutation({
    mutationFn: async ({ limit = 100 }: { limit?: number }) => {
      const { data, error } = await supabase.functions.invoke('fetch-missing-images', {
        body: { batchSize: 50, limit }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Images Fetched",
        description: data.message || `Updated ${data.stats?.updated || 0} cards`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to fetch images",
        variant: "destructive",
      });
    },
  });

  // Auto-run English names until complete
  const runAllEnglishNames = async () => {
    setIsRunningEnglishNames(true);
    setEnglishNamesProgress({ processed: 0, updated: 0 });
    let totalProcessed = 0;
    let totalUpdated = 0;

    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke('backfill-english-names', {
          body: { batchSize: 50, limit: 100 }
        });

        if (error) throw error;

        const processed = data?.stats?.processed || 0;
        const updated = data?.stats?.updated || 0;

        totalProcessed += processed;
        totalUpdated += updated;
        setEnglishNamesProgress({ processed: totalProcessed, updated: totalUpdated });

        // Stop if no more cards to process
        if (processed === 0 || updated === 0) {
          break;
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "English Names Complete",
        description: `Processed ${totalProcessed} cards, updated ${totalUpdated}`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Fetch Failed",
        description: error instanceof Error ? error.message : "Failed to fetch English names",
        variant: "destructive",
      });
    } finally {
      setIsRunningEnglishNames(false);
    }
  };

  // Auto-run image fetch until complete
  const runAllImages = async () => {
    setIsRunningImages(true);
    setImagesProgress({ processed: 0, updated: 0 });
    let totalProcessed = 0;
    let totalUpdated = 0;

    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke('fetch-missing-images', {
          body: { batchSize: 50, limit: 100 }
        });

        if (error) throw error;

        const processed = data?.stats?.processed || 0;
        const updated = data?.stats?.updated || 0;

        totalProcessed += processed;
        totalUpdated += updated;
        setImagesProgress({ processed: totalProcessed, updated: totalUpdated });

        // Stop if no more cards to process
        if (processed === 0 || updated === 0) {
          break;
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Image Fetch Complete",
        description: `Processed ${totalProcessed} cards, updated ${totalUpdated}`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Fetch Failed",
        description: error instanceof Error ? error.message : "Failed to fetch images",
        variant: "destructive",
      });
    } finally {
      setIsRunningImages(false);
    }
  };

  // Reset page when filters change
  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
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
                Browse and verify Pokemon card data • Default: Recently synced first
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsSection />

        {/* Bulk Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Bulk Actions</h3>
              {(isRunningEnglishNames || isRunningImages) && (
                <Badge variant="secondary" className="animate-pulse">
                  Running...
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateImagesMutation.mutate({ validateAll: true })}
                disabled={validateImagesMutation.isPending || isRunningImages}
              >
                <Image className="h-4 w-4 mr-2" />
                {validateImagesMutation.isPending ? "Validating..." : "Validate All Images"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={runAllEnglishNames}
                disabled={isRunningEnglishNames || isRunningImages}
              >
                <Globe className="h-4 w-4 mr-2" />
                {isRunningEnglishNames
                  ? `Running... (${englishNamesProgress.updated} updated)`
                  : "Fetch All English Names"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={runAllImages}
                disabled={isRunningEnglishNames || isRunningImages}
              >
                <Download className="h-4 w-4 mr-2" />
                {isRunningImages
                  ? `Running... (${imagesProgress.updated} updated)`
                  : "Fetch All Missing Images"}
              </Button>
            </div>
            {(isRunningEnglishNames || isRunningImages) && (
              <p className="text-xs text-muted-foreground mt-2">
                This will keep running until all cards are processed. Please wait...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Duplicate Warning Banner */}
        {duplicateData?.stats?.totalDuplicates > 0 && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <Copy className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive flex items-center gap-2">
              Duplicate Cards Detected
              <Badge variant="destructive">
                {duplicateData.stats.totalDuplicates.toLocaleString()} duplicates
              </Badge>
            </AlertTitle>
            <AlertDescription className="text-destructive/80">
              <div className="flex items-center justify-between">
                <span>
                  Found {duplicateData.stats.totalGroups.toLocaleString()} groups of duplicate cards across{" "}
                  {duplicateData.stats.affectedSets.length} sets. 
                  These should be cleaned up to prevent data issues.
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDuplicateModal(true)}
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Up Duplicates
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* No duplicates badge */}
        {duplicateData && duplicateData.stats?.totalDuplicates === 0 && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">No Duplicates</AlertTitle>
            <AlertDescription className="text-green-600">
              Card catalog is clean - no duplicate entries found.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <CardCatalogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
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
            {filters.dataStatus === "missing_english" && (
              <Badge className="bg-blue-500/20 text-blue-600">
                Japanese cards without English names
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

        {/* Duplicate Cleanup Modal */}
        <DuplicateCleanupModal
          open={showDuplicateModal}
          onOpenChange={setShowDuplicateModal}
          duplicateCount={duplicateData?.stats?.totalDuplicates || 0}
          affectedSets={duplicateData?.stats?.affectedSets || []}
        />
      </div>
    </AdminLayout>
  );
}

