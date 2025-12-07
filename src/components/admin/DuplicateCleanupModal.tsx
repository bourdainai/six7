import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Loader2,
  Eye,
  Database,
  RefreshCw,
} from "lucide-react";
import { useCleanupDuplicates, CleanupResult } from "@/hooks/useCardCatalog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DuplicateCleanupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateCount: number;
  affectedSets: Array<{ set_code: string; duplicates: number }>;
  onCleanupComplete?: () => void;
}

export function DuplicateCleanupModal({
  open,
  onOpenChange,
  duplicateCount,
  affectedSets,
  onCleanupComplete,
}: DuplicateCleanupModalProps) {
  const { toast } = useToast();
  const cleanupMutation = useCleanupDuplicates();
  const [previewResult, setPreviewResult] = useState<CleanupResult | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({
    deleted: 0,
    total: 0,
    remaining: 0,
    iterations: 0,
  });

  const handlePreview = async () => {
    try {
      const result = await cleanupMutation.mutateAsync({ dryRun: true });
      setPreviewResult(result || null);
      setIsPreviewMode(true);
      setDeleteProgress({
        deleted: 0,
        total: result?.stats.cardsToDelete || 0,
        remaining: result?.stats.cardsToDelete || 0,
        iterations: 0,
      });
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCleanup = useCallback(async () => {
    if (!previewResult) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${previewResult.stats.cardsToDelete.toLocaleString()} duplicate cards? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setIsPreviewMode(false);
    
    let totalDeleted = 0;
    let iterations = 0;
    let remaining = previewResult.stats.cardsToDelete;
    const maxIterations = 50; // Safety limit

    try {
      // Keep calling the cleanup function until no duplicates remain
      while (remaining > 0 && iterations < maxIterations) {
        iterations++;
        console.log(`🧹 Cleanup iteration ${iterations}, remaining: ${remaining}`);

        const result = await cleanupMutation.mutateAsync({ dryRun: false });
        
        if (!result?.success) {
          throw new Error(result?.errors?.[0] || "Cleanup failed");
        }

        const deletedThisRound = result.stats.actualDeleted || 0;
        totalDeleted += deletedThisRound;
        remaining = result.stats.remainingDuplicates ?? 0;

        setDeleteProgress({
          deleted: totalDeleted,
          total: previewResult.stats.cardsToDelete,
          remaining,
          iterations,
        });

        // Update the preview result with latest stats
        setPreviewResult(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            actualDeleted: totalDeleted,
            remainingDuplicates: remaining,
            iterations,
          },
          message: result.message,
        } : null);

        // If nothing was deleted but there are remaining, something is wrong
        if (deletedThisRound === 0 && remaining > 0) {
          console.warn("No cards deleted but duplicates remain - may be a permissions issue");
          break;
        }

        // Small delay between iterations
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setIsDeleting(false);

      if (remaining === 0) {
        toast({
          title: "Cleanup complete!",
          description: `Successfully removed ${totalDeleted.toLocaleString()} duplicate cards in ${iterations} round(s).`,
        });
        onCleanupComplete?.();
      } else {
        toast({
          title: "Cleanup partially complete",
          description: `Removed ${totalDeleted.toLocaleString()} cards. ${remaining.toLocaleString()} duplicates still remain.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsDeleting(false);
      console.error("Cleanup error:", error);
      toast({
        title: "Cleanup error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [previewResult, cleanupMutation, toast, onCleanupComplete]);

  const handleClose = () => {
    if (isDeleting) {
      const confirmed = window.confirm("Cleanup is in progress. Are you sure you want to close?");
      if (!confirmed) return;
    }
    setPreviewResult(null);
    setIsPreviewMode(true);
    setIsDeleting(false);
    setDeleteProgress({ deleted: 0, total: 0, remaining: 0, iterations: 0 });
    onOpenChange(false);
  };

  const progressPercent = deleteProgress.total > 0 
    ? Math.round((deleteProgress.deleted / deleteProgress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Duplicate Card Cleanup
          </DialogTitle>
          <DialogDescription>
            Remove duplicate cards from the database. The best quality record (with images and prices) will be kept.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-muted-foreground">Duplicates Found</p>
            <p className="text-2xl font-bold text-destructive">{duplicateCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Affected Sets</p>
            <p className="text-2xl font-bold">{affectedSets.length}</p>
          </div>
        </div>

        {/* Top Affected Sets */}
        {affectedSets.length > 0 && !previewResult && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Most Affected Sets:</h4>
            <div className="flex flex-wrap gap-2">
              {affectedSets.slice(0, 10).map((set) => (
                <Badge key={set.set_code} variant="outline">
                  {set.set_code}: {set.duplicates}
                </Badge>
              ))}
              {affectedSets.length > 10 && (
                <Badge variant="secondary">+{affectedSets.length - 10} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Preview/Delete Results */}
        {previewResult && (
          <div className="space-y-4">
            {isPreviewMode ? (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <Eye className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-600">Preview Mode</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  This is a preview. No cards have been deleted yet.
                </AlertDescription>
              </Alert>
            ) : isDeleting ? (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <AlertTitle className="text-blue-600">Deleting Duplicates...</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <div className="space-y-2">
                    <p>
                      Round {deleteProgress.iterations}: Deleted {deleteProgress.deleted.toLocaleString()} of {deleteProgress.total.toLocaleString()} cards
                    </p>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs">
                      {deleteProgress.remaining.toLocaleString()} remaining • {progressPercent}% complete
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className={deleteProgress.remaining === 0 
                ? "border-green-500/50 bg-green-500/10" 
                : "border-yellow-500/50 bg-yellow-500/10"
              }>
                <CheckCircle2 className={`h-4 w-4 ${deleteProgress.remaining === 0 ? "text-green-500" : "text-yellow-500"}`} />
                <AlertTitle className={deleteProgress.remaining === 0 ? "text-green-600" : "text-yellow-600"}>
                  {deleteProgress.remaining === 0 ? "Cleanup Complete!" : "Cleanup Finished"}
                </AlertTitle>
                <AlertDescription className={deleteProgress.remaining === 0 ? "text-green-600" : "text-yellow-600"}>
                  {previewResult.message || `Removed ${deleteProgress.deleted.toLocaleString()} duplicate cards.`}
                  <span className="block text-sm mt-1">
                    Completed in {deleteProgress.iterations} round(s)
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Results Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Duplicate Groups</p>
                <p className="text-lg font-bold">{previewResult.stats.duplicateGroups.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <p className="text-xs text-muted-foreground">
                  {isPreviewMode ? "To Delete" : "Deleted"}
                </p>
                <p className="text-lg font-bold text-destructive">
                  {isPreviewMode 
                    ? previewResult.stats.cardsToDelete.toLocaleString() 
                    : deleteProgress.deleted.toLocaleString()
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground">Kept (Best)</p>
                <p className="text-lg font-bold text-green-600">
                  {previewResult.stats.duplicateGroups.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Sample of what will be deleted */}
            {previewResult.sampleDeleted && previewResult.sampleDeleted.length > 0 && isPreviewMode && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Sample to be Removed ({previewResult.sampleDeleted.length}):
                </h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Set</TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.sampleDeleted.slice(0, 10).map((card, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{card.name}</TableCell>
                          <TableCell className="font-mono text-xs">{card.set_code}</TableCell>
                          <TableCell>{card.number}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {card.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State for Preview */}
        {cleanupMutation.isPending && isPreviewMode && !isDeleting && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analyzing duplicates... (this may take a moment for large databases)
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            {previewResult && !isPreviewMode && !isDeleting ? "Done" : "Cancel"}
          </Button>
          
          {!previewResult && (
            <Button
              onClick={handlePreview}
              disabled={cleanupMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Cleanup
            </Button>
          )}
          
          {previewResult && isPreviewMode && !isDeleting && (
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending || previewResult.stats.cardsToDelete === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm Delete ({previewResult.stats.cardsToDelete.toLocaleString()})
            </Button>
          )}

          {isDeleting && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting... Do not close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
