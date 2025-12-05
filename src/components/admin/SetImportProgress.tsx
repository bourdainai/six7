import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Pause, Play, X, Image, DollarSign, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImportQueueProgress, LiveCardInsert } from "@/hooks/useSetManager";

interface SetImportProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ImportQueueProgress;
  onStop?: () => void;
  onResume?: () => void;
  onClose?: () => void;
  liveCards?: LiveCardInsert[];
  totalCards?: number;
}

export function SetImportProgress({
  open,
  onOpenChange,
  progress,
  onStop,
  onResume,
  onClose,
  liveCards = [],
  totalCards = 0,
}: SetImportProgressProps) {
  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  const remaining = progress.total - progress.completed;

  const handleClose = () => {
    if (progress.isRunning) {
      // Don't close while running
      return;
    }
    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {progress.isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
              {progress.isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {progress.isPaused && <Pause className="h-5 w-5 text-yellow-500" />}
              {progress.isComplete
                ? "Import Complete" 
                : progress.isPaused
                ? "Import Paused"
                : "Importing Sets..."}
            </span>
            {progress.isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {progress.isComplete
              ? `Successfully imported ${progress.completed} set(s) with ${progress.totalCardsImported.toLocaleString()} cards`
              : progress.isPaused
              ? `Paused at ${progress.completed} of ${progress.total} sets`
              : progress.currentSet
              ? `Processing: ${progress.currentSet.name} (Set ${progress.completed + 1}/${progress.total})`
              : `Preparing to import ${progress.total} set(s)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Sets Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sets Progress</span>
              <span>
                {progress.completed} / {progress.total} sets ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Current Set Details */}
          {progress.currentSet && progress.isRunning && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <AlertTitle className="text-blue-600">Currently Processing</AlertTitle>
              <AlertDescription className="text-blue-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{progress.currentSet.name}</span>
                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                    {progress.currentSet.id}
                  </Badge>
                </div>
                {progress.currentSetStats && (
                  <div className="mt-2 text-sm">
                    <span>{progress.currentSetStats.cardsProcessed.toLocaleString()} cards processed</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-3xl font-bold text-green-600">
                {progress.totalCardsImported.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Cards Imported</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {progress.totalCardsSkipped.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Skipped (Duplicates)</div>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-3xl font-bold text-red-600">
                {progress.errors.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Errors</div>
            </div>
          </div>

          {/* Field Completion (if available) */}
          {progress.currentSetStats && progress.currentSetStats.cardsProcessed > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Set Field Completion</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <Image className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-semibold">
                    {progress.currentSetStats.fieldCompletion.images}
                  </div>
                  <div className="text-xs text-muted-foreground">With Images</div>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <DollarSign className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                  <div className="text-lg font-semibold">
                    {progress.currentSetStats.fieldCompletion.pricing}
                  </div>
                  <div className="text-xs text-muted-foreground">With Pricing</div>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <FileText className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                  <div className="text-lg font-semibold">
                    {progress.currentSetStats.fieldCompletion.metadata}
                  </div>
                  <div className="text-xs text-muted-foreground">With Metadata</div>
                </div>
              </div>
            </div>
          )}

          {/* Live Card Feed */}
          {liveCards.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                Live Feed (Real-time from Database)
              </h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg bg-muted/20">
                {liveCards.slice(0, 15).map((card, idx) => (
                  <div
                    key={card.id}
                    className={`flex items-center gap-2 p-2 text-sm border-b last:border-0 ${
                      idx === 0 ? "bg-green-500/10" : ""
                    }`}
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-6 h-8 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-6 h-8 bg-muted rounded" />
                    )}
                    <span className="flex-1 truncate font-medium">{card.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {card.setName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {card.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database Total */}
          {totalCards > 0 && (
            <div className="text-sm text-center text-muted-foreground border-t pt-3">
              Total cards in database: <span className="font-semibold text-foreground">{totalCards.toLocaleString()}</span>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Errors</AlertTitle>
              <AlertDescription>
                <div className="max-h-24 overflow-y-auto space-y-1 mt-2">
                  {progress.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{error.setName}:</span> {error.error}
                    </div>
                  ))}
                  {progress.errors.length > 5 && (
                    <div className="text-xs">...and {progress.errors.length - 5} more errors</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Banners */}
          {progress.isComplete && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-600">All Sets Imported!</AlertTitle>
              <AlertDescription className="text-green-600">
                Successfully processed {progress.completed} set(s) with {progress.totalCardsImported.toLocaleString()} cards imported.
              </AlertDescription>
            </Alert>
          )}

          {progress.isPaused && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <Pause className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-600">Import Paused</AlertTitle>
              <AlertDescription className="text-yellow-600">
                {remaining} set(s) remaining. Click Resume to continue.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            {progress.isPaused && onResume && (
              <Button onClick={onResume} className="bg-green-500 hover:bg-green-600">
                <Play className="h-4 w-4 mr-2" />
                Resume ({remaining} remaining)
              </Button>
            )}
            {!progress.isRunning && (
              <Button onClick={handleClose}>
                {progress.isComplete ? "Done" : "Close"}
              </Button>
            )}
            {progress.isRunning && (
              <div className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Import in progress... Please wait.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
