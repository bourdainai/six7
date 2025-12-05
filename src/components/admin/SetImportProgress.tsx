import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SetImportProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSet?: string;
  completed: number;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  isComplete: boolean;
  onCancel?: () => void;
}

export function SetImportProgress({
  open,
  onOpenChange,
  currentSet,
  completed,
  total,
  imported,
  skipped,
  errors,
  isComplete,
  onCancel,
}: SetImportProgressProps) {
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? "Import Complete" : "Importing Sets"}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? "All sets have been processed"
              : `Importing set ${completed + 1} of ${total}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Current Set */}
          {currentSet && !isComplete && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground">Processing:</span>
              <span className="font-medium font-mono">{currentSet}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Imported</span>
              </div>
              <p className="text-2xl font-bold">{imported.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Skipped</span>
              </div>
              <p className="text-2xl font-bold">{skipped.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">(duplicates)</p>
            </div>
            {errors > 0 && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">Errors</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{errors}</p>
              </div>
            )}
          </div>

          {/* Status Badges */}
          {isComplete && (
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </Badge>
              {errors === 0 && (
                <Badge variant="outline">No errors</Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {!isComplete && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {isComplete && (
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

