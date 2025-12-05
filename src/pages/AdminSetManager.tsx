import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SetImportTable } from "@/components/admin/SetImportTable";
import { SetImportProgress } from "@/components/admin/SetImportProgress";
import {
  useSetCoverage,
  useImportSet,
  useImportMultipleSets,
  useImportActivityTracker,
} from "@/hooks/useSetManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Activity,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
            <p className="text-2xl font-bold">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsSection({ sets, totalCardsInDB }: { sets: any[]; totalCardsInDB: number }) {
  if (!sets || sets.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-16" />
          </Card>
        ))}
      </div>
    );
  }

  const totalSets = sets.length;
  const completeSets = sets.filter((s) => s.status === "complete").length;
  const partialSets = sets.filter((s) => s.status === "partial").length;
  const missingSets = sets.filter((s) => s.status === "missing").length;
  const totalCardsInGitHub = sets.reduce((sum, s) => sum + s.githubTotal, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatsCard
        icon={Database}
        label="Cards in Database"
        value={totalCardsInDB}
        subValue={`of ${totalCardsInGitHub.toLocaleString()} available`}
        variant="default"
      />
      <StatsCard
        icon={Database}
        label="Total Sets"
        value={totalSets}
        variant="default"
      />
      <StatsCard
        icon={CheckCircle2}
        label="Complete Sets"
        value={completeSets}
        subValue={`${Math.round((completeSets / totalSets) * 100)}%`}
        variant="success"
      />
      <StatsCard
        icon={AlertTriangle}
        label="Partial Sets"
        value={partialSets}
        variant="warning"
      />
      <StatsCard
        icon={XCircle}
        label="Missing Sets"
        value={missingSets}
        variant="danger"
      />
    </div>
  );
}

export default function AdminSetManager() {
  const { data: sets, isLoading, refetch: refetchSets } = useSetCoverage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { activity, totalCards, resetActivity, refetch: refetchTotalCards } = useImportActivityTracker();
  
  const [importProgress, setImportProgress] = useState<{
    open: boolean;
    currentSet?: string;
    completed: number;
    total: number;
    imported: number;
    skipped: number;
    errors: number;
    isComplete: boolean;
  }>({
    open: false,
    completed: 0,
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    isComplete: false,
  });

  const importSetMutation = useImportSet();
  const importMultipleMutation = useImportMultipleSets();

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      await queryClient.invalidateQueries({ queryKey: ["set-coverage"] });
      await refetchTotalCards();
      await refetchSets();
      setLastRefreshed(new Date());
      toast({
        title: "Data refreshed",
        description: "Coverage statistics have been updated",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when activity detected
  useEffect(() => {
    if (activity.isActive && activity.recentInserts > 0 && activity.recentInserts % 50 === 0) {
      // Refresh every 50 cards imported
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
    }
  }, [activity.recentInserts, activity.isActive, queryClient]);

  const handleSetSelected = (setId: string, selected: boolean) => {
    const newSelected = new Set(selectedSets);
    if (selected) {
      newSelected.add(setId);
    } else {
      newSelected.delete(setId);
    }
    setSelectedSets(newSelected);
  };

  const handleImportSet = async (setId: string) => {
    const setName =
      sets?.find((s) => s.setId === setId)?.setName || setId;

    try {
      setImportProgress({
        open: true,
        currentSet: setId,
        completed: 0,
        total: 1,
        imported: 0,
        skipped: 0,
        errors: 0,
        isComplete: false,
      });

      const result = await importSetMutation.mutateAsync({
        setId,
        setName,
      });

      setImportProgress({
        open: true,
        currentSet: setId,
        completed: 1,
        total: 1,
        imported: result?.stats?.totalImported || 0,
        skipped: result?.stats?.totalSkipped || 0,
        errors: result?.stats?.totalErrors || 0,
        isComplete: true,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["set-coverage"] });

      toast({
        title: "Import complete",
        description: `Imported ${result?.stats?.totalImported || 0} cards from ${setName}`,
      });
    } catch (error) {
      setImportProgress((prev) => ({
        ...prev,
        errors: prev.errors + 1,
        isComplete: true,
      }));

      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRefreshSet = async (setId: string) => {
    await handleImportSet(setId);
  };

  const handleImportAllMissing = async () => {
    if (!sets) return;

    const missingSets = sets
      .filter((s) => s.status === "missing" || s.status === "partial")
      .map((s) => s.setId);

    if (missingSets.length === 0) {
      toast({
        title: "Nothing to import",
        description: "All sets are already complete",
      });
      return;
    }

    const confirmed = window.confirm(
      `Import ${missingSets.length} sets? This may take a while.`
    );
    if (!confirmed) return;

    setImportProgress({
      open: true,
      completed: 0,
      total: missingSets.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      isComplete: false,
    });

    try {
      const result = await importMultipleMutation.mutateAsync({
        setIds: missingSets,
        onProgress: (progress) => {
          setImportProgress({
            open: true,
            currentSet: progress.current,
            completed: progress.completed,
            total: progress.total,
            imported: progress.imported,
            skipped: progress.skipped,
            errors: 0,
            isComplete: progress.completed === progress.total,
          });
        },
      });

      setImportProgress((prev) => ({
        ...prev,
        isComplete: true,
        errors: result.results.filter((r: any) => !r.success).length,
      }));

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["set-coverage"] });

      toast({
        title: "Bulk import complete",
        description: `Imported ${result.totalImported} cards, skipped ${result.totalSkipped} duplicates`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleImportSelected = async () => {
    if (selectedSets.size === 0) {
      toast({
        title: "No sets selected",
        description: "Please select sets to import",
      });
      return;
    }

    const setIds = Array.from(selectedSets);
    const confirmed = window.confirm(
      `Import ${setIds.length} selected set(s)?`
    );
    if (!confirmed) return;

    setImportProgress({
      open: true,
      completed: 0,
      total: setIds.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      isComplete: false,
    });

    try {
      const result = await importMultipleMutation.mutateAsync({
        setIds,
        onProgress: (progress) => {
          setImportProgress({
            open: true,
            currentSet: progress.current,
            completed: progress.completed,
            total: progress.total,
            imported: progress.imported,
            skipped: progress.skipped,
            errors: 0,
            isComplete: progress.completed === progress.total,
          });
        },
      });

      setImportProgress((prev) => ({
        ...prev,
        isComplete: true,
        errors: result.results.filter((r: any) => !r.success).length,
      }));

      // Refresh data and clear selection
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["set-coverage"] });
      setSelectedSets(new Set());

      toast({
        title: "Import complete",
        description: `Imported ${result.totalImported} cards, skipped ${result.totalSkipped} duplicates`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const missingCount = sets?.filter(
    (s) => s.status === "missing" || s.status === "partial"
  ).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Real-time Activity Banner */}
        {activity.isActive && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            <AlertTitle className="text-green-600 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Import in Progress
            </AlertTitle>
            <AlertDescription className="text-green-600">
              <div className="flex items-center gap-4">
                <span>
                  <strong>{activity.recentInserts.toLocaleString()}</strong> cards imported this session
                </span>
                <span className="text-green-500/70">
                  Total in database: <strong>{totalCards.toLocaleString()}</strong>
                </span>
                {activity.lastInsertTime && (
                  <span className="text-green-500/70 text-sm">
                    Last insert: {activity.lastInsertTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!activity.isActive && activity.recentInserts > 0 && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-600">Import Session Complete</AlertTitle>
            <AlertDescription className="text-blue-600">
              <div className="flex items-center justify-between">
                <span>
                  <strong>{activity.recentInserts.toLocaleString()}</strong> cards were imported. 
                  Total in database: <strong>{totalCards.toLocaleString()}</strong>
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { resetActivity(); handleRefresh(); }}
                  className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh & Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Set Import Manager
                </h1>
                <p className="text-sm text-muted-foreground">
                  Import Pokemon card sets from GitHub repository
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            {selectedSets.size > 0 && (
              <Button
                onClick={handleImportSelected}
                disabled={
                  importSetMutation.isPending || importMultipleMutation.isPending
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Import Selected ({selectedSets.size})
              </Button>
            )}
            {missingCount > 0 && (
              <Button
                onClick={handleImportAllMissing}
                disabled={
                  importSetMutation.isPending || importMultipleMutation.isPending
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Import All Missing ({missingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Last Refreshed Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>
            Last refreshed: {lastRefreshed.toLocaleTimeString()} • 
            Total cards in database: <strong className="text-foreground">{totalCards.toLocaleString()}</strong>
          </span>
          {activity.isActive && (
            <Badge variant="outline" className="ml-2 animate-pulse border-green-500 text-green-500">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>

        {/* Stats */}
        <StatsSection sets={sets || []} totalCardsInDB={totalCards} />

        {/* Set Table */}
        <SetImportTable
          sets={sets || []}
          isLoading={isLoading}
          onImportSet={handleImportSet}
          onRefreshSet={handleRefreshSet}
          selectedSets={selectedSets}
          onSetSelected={handleSetSelected}
        />

        {/* Import Progress Modal */}
        <SetImportProgress
          open={importProgress.open}
          onOpenChange={(open) =>
            setImportProgress((prev) => ({ ...prev, open }))
          }
          currentSet={importProgress.currentSet}
          completed={importProgress.completed}
          total={importProgress.total}
          imported={importProgress.imported}
          skipped={importProgress.skipped}
          errors={importProgress.errors}
          isComplete={importProgress.isComplete}
          onCancel={() => {
            // Cancel logic could go here
            setImportProgress((prev) => ({ ...prev, open: false }));
          }}
        />
      </div>
    </AdminLayout>
  );
}

