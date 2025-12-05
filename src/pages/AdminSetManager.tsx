import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SetImportTable } from "@/components/admin/SetImportTable";
import { SetImportProgress } from "@/components/admin/SetImportProgress";
import {
  useSetCoverage,
  useImportSet,
  useImportMultipleSets,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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

function StatsSection({ sets }: { sets: any[] }) {
  if (!sets || sets.length === 0) {
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

  const totalSets = sets.length;
  const completeSets = sets.filter((s) => s.status === "complete").length;
  const partialSets = sets.filter((s) => s.status === "partial").length;
  const missingSets = sets.filter((s) => s.status === "missing").length;
  const totalCardsInDB = sets.reduce((sum, s) => sum + s.dbCount, 0);
  const totalCardsInGitHub = sets.reduce((sum, s) => sum + s.githubTotal, 0);
  const overallCoverage =
    totalCardsInGitHub > 0
      ? Math.round((totalCardsInDB / totalCardsInGitHub) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        icon={Database}
        label="Total Sets Available"
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
  const { data: sets, isLoading } = useSetCoverage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
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

        {/* Stats */}
        <StatsSection sets={sets || []} />

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

