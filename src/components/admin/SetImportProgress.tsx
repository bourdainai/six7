import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Pause, Play, X } from "lucide-react";
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
  const estimatedTime = remaining > 0 
    ? Math.round((remaining * 15) / 60) // ~15 seconds per set average
    : 0;

  const handleClose = () => {
    if (progress.isRunning) {
      // Don't allow closing while running - must stop first
      return;
    }
    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {progress.isComplete || (progress.completed === progress.total && !progress.isRunning)
                ? "Import Complete" 
                : progress.isPaused
                ? "Import Paused"
                : "Importing Sets"}
            </span>
            {progress.isRunning && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onStop}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {progress.isComplete || (progress.completed === progress.total && !progress.isRunning)
              ? `Successfully imported ${progress.total} set(s)`
              : progress.isPaused
              ? `Paused at ${progress.completed} of ${progress.total} sets`
              : progress.currentSet
              ? `Importing: ${progress.currentSet.name} (${progress.completed + 1}/${progress.total})`
              : `Preparing to import ${progress.total} set(s)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.completed} of {progress.total} sets completed
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {remaining > 0 && progress.isRunning && (
              <p className="text-xs text-muted-foreground">
                Estimated {estimatedTime} minute(s) remaining
              </p>
            )}
          </div>

          {/* Current Set */}
          {progress.currentSet && progress.isRunning && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <AlertTitle className="text-blue-600">Currently Importing</AlertTitle>
              <AlertDescription className="text-blue-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{progress.currentSet.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {progress.currentSet.id}
                  </Badge>
                </div>
                <p className="text-sm mt-1">Cards are being imported in real-time...</p>
                {totalCards > 0 && (
                  <p className="text-xs mt-1 opacity-75">
                    Total in database: {totalCards.toLocaleString()}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Live Card Feed */}
          {liveCards.length > 0 && progress.isRunning && (
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                <span>Live Card Feed</span>
              </div>
              <div className="space-y-1">
                {liveCards.slice(0, 10).map((card, idx) => (
                  <div
                    key={card.id}
                    className={`flex items-center gap-2 text-xs p-1 rounded ${
                      idx === 0 ? "bg-green-500/20" : "bg-transparent"
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
                    <span className="flex-1 truncate">{card.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {card.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Cards Imported</span>
              </div>
              <p className="text-2xl font-bold">{progress.totalCardsImported.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Skipped</span>
              </div>
              <p className="text-2xl font-bold">{progress.totalCardsSkipped.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">(duplicates)</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-muted-foreground">Errors</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{progress.errors.length}</p>
            </div>
          </div>

          {/* Errors */}
          {progress.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Errors</AlertTitle>
              <AlertDescription>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {progress.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{error.setName}:</span> {error.error}
                    </div>
                  ))}
                  {progress.errors.length > 5 && (
                    <p className="text-xs">...and {progress.errors.length - 5} more errors</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badges */}
          {progress.isComplete ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-600">All Sets Imported!</AlertTitle>
              <AlertDescription className="text-green-600">
                Successfully imported {progress.total} set(s) with {progress.totalCardsImported.toLocaleString()} cards
              </AlertDescription>
            </Alert>
          ) : progress.isPaused ? (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <Pause className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-600">Import Paused</AlertTitle>
              <AlertDescription className="text-yellow-600">
                {remaining} set(s) remaining. Click Resume to continue.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {progress.isRunning && onStop && (
              <Button variant="outline" onClick={onStop}>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            {progress.isPaused && onResume && (
              <Button onClick={onResume}>
                <Play className="h-4 w-4 mr-2" />
                Resume ({remaining} remaining)
              </Button>
            )}
            {!progress.isRunning && !progress.isPaused && (
              <Button onClick={handleClose}>
                {progress.completed === progress.total ? "Done" : "Close"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
