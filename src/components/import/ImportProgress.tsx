import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ImportProgressProps {
  current: number;
  total: number;
  message?: string;
}

export function ImportProgress({ current, total, message }: ImportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="py-8 text-center space-y-6">
      <div className="flex justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>

      <div className="space-y-2">
        <p className="font-medium">
          {message || "Importing your collection..."}
        </p>
        {total > 0 && (
          <p className="text-sm text-muted-foreground">
            Processing {current} of {total} cards
          </p>
        )}
      </div>

      {total > 0 && (
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">{percentage}% complete</p>
        </div>
      )}
    </div>
  );
}
