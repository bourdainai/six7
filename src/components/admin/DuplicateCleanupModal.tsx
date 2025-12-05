import { useState } from "react";
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
}

export function DuplicateCleanupModal({
  open,
  onOpenChange,
  duplicateCount,
  affectedSets,
}: DuplicateCleanupModalProps) {
  const { toast } = useToast();
  const cleanupMutation = useCleanupDuplicates();
  const [previewResult, setPreviewResult] = useState<CleanupResult | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  const handlePreview = async () => {
    try {
      const result = await cleanupMutation.mutateAsync({ dryRun: true });
      setPreviewResult(result || null);
      setIsPreviewMode(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCleanup = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${previewResult?.stats.cardsToDelete || duplicateCount} duplicate cards? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const result = await cleanupMutation.mutateAsync({ dryRun: false });
      setPreviewResult(result || null);
      setIsPreviewMode(false);
      
      toast({
        title: "Cleanup complete",
        description: `Removed ${result?.stats.actualDeleted || 0} duplicate cards`,
      });
    } catch (error) {
      toast({
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setPreviewResult(null);
    setIsPreviewMode(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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

        {/* Preview Results */}
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
            ) : (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-600">Cleanup Complete</AlertTitle>
                <AlertDescription className="text-green-600">
                  Successfully removed {previewResult.stats.actualDeleted} duplicate cards.
                </AlertDescription>
              </Alert>
            )}

            {/* Results Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Duplicate Groups</p>
                <p className="text-lg font-bold">{previewResult.stats.duplicateGroups}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <p className="text-xs text-muted-foreground">
                  {isPreviewMode ? "To Delete" : "Deleted"}
                </p>
                <p className="text-lg font-bold text-destructive">
                  {isPreviewMode ? previewResult.stats.cardsToDelete : previewResult.stats.actualDeleted}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground">Kept (Best)</p>
                <p className="text-lg font-bold text-green-600">
                  {previewResult.stats.duplicateGroups}
                </p>
              </div>
            </div>

            {/* Sample of what will be deleted */}
            {previewResult.sampleDeleted.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Sample {isPreviewMode ? "to be" : ""} Removed ({previewResult.sampleDeleted.length}):
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

        {/* Loading State */}
        {cleanupMutation.isPending && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isPreviewMode ? "Analyzing duplicates..." : "Removing duplicates..."}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {previewResult && !isPreviewMode ? "Done" : "Cancel"}
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
          
          {previewResult && isPreviewMode && (
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending || previewResult.stats.cardsToDelete === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm Delete ({previewResult.stats.cardsToDelete})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

