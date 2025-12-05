import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Database,
  Image,
  DollarSign,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Eye,
} from "lucide-react";
import {
  useActiveImportJob,
  useImportSetProgress,
  useImportLogs,
  calculateFieldPercentage,
  formatDuration,
  estimateRemainingTime,
  ImportJob,
} from "@/hooks/useImportJobs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FieldProgressProps {
  label: string;
  icon: React.ReactNode;
  total: number;
  complete: number;
}

function FieldProgress({ label, icon, total, complete }: FieldProgressProps) {
  const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
  const isComplete = percentage === 100;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded ${isComplete ? "bg-green-500/20" : "bg-muted"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className={isComplete ? "text-green-500 font-medium" : "text-foreground"}>
            {complete.toLocaleString()}/{total.toLocaleString()}
          </span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>
      <Badge
        variant={isComplete ? "default" : "outline"}
        className={`text-xs w-12 justify-center ${isComplete ? "bg-green-500" : ""}`}
      >
        {percentage}%
      </Badge>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    running: { variant: "default", className: "bg-blue-500 animate-pulse" },
    pending: { variant: "secondary", className: "" },
    paused: { variant: "outline", className: "border-yellow-500 text-yellow-500" },
    completed: { variant: "default", className: "bg-green-500" },
    failed: { variant: "destructive", className: "" },
    cancelled: { variant: "outline", className: "text-muted-foreground" },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant={config.variant} className={config.className}>
      {status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
      {status === "paused" && <Pause className="h-3 w-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ImportActivityDashboard() {
  const { job, isLoading } = useActiveImportJob();
  const { setProgress } = useImportSetProgress(job?.id || null);
  const { logs } = useImportLogs(job?.id || null, 10);
  const [isExpanded, setIsExpanded] = useState(true);

  // No active job
  if (!job && !isLoading) {
    return (
      <Alert className="mb-6 border-muted bg-muted/30">
        <Database className="h-4 w-4" />
        <AlertTitle>No Active Import</AlertTitle>
        <AlertDescription>
          Click "Import" on a set below to start importing cards. Real-time updates will appear here as cards are added to the database.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Alert className="mb-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking for active imports...</AlertTitle>
      </Alert>
    );
  }

  if (!job) return null;

  // Calculate progress percentages
  const setsProgress = job.sets_total > 0 ? Math.round((job.sets_completed / job.sets_total) * 100) : 0;
  const cardsProgress = job.cards_total > 0 ? Math.round((job.cards_imported / job.cards_total) * 100) : 0;

  // Current set being processed
  const currentSetProgress = setProgress.find(sp => sp.status === "running");

  return (
    <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Import in Progress
                  <StatusBadge status={job.status} />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {job.current_set_name
                    ? `Processing: ${job.current_set_name}`
                    : `${job.job_type === "bulk_import" ? "Bulk" : "Single"} import from ${job.source}`}
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="grid grid-cols-2 gap-6">
              {/* Sets Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sets</span>
                  <span className="font-medium">
                    {job.sets_completed} / {job.sets_total}
                  </span>
                </div>
                <Progress value={setsProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{setsProgress}% complete</span>
                  {job.sets_failed > 0 && (
                    <span className="text-red-500">{job.sets_failed} failed</span>
                  )}
                </div>
              </div>

              {/* Cards Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cards</span>
                  <span className="font-medium">
                    {job.cards_imported.toLocaleString()} / {job.cards_total.toLocaleString()}
                  </span>
                </div>
                <Progress value={cardsProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{cardsProgress}% complete</span>
                  <span>
                    {job.avg_cards_per_second
                      ? `${job.avg_cards_per_second.toFixed(1)} cards/sec`
                      : "Calculating..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Card */}
            {job.current_card_name && (
              <Alert className="border-blue-500/30 bg-blue-500/5">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <AlertTitle className="text-blue-600">Currently Processing</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <span className="font-medium">{job.current_card_name}</span>
                  <span className="text-blue-500/70 ml-2">({job.current_card_id})</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Field Completion */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Data Field Completion
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldProgress
                  label="Core (ID, Name, Set)"
                  icon={<Database className="h-4 w-4 text-blue-500" />}
                  total={job.fields_summary?.core?.total || 0}
                  complete={job.fields_summary?.core?.complete || 0}
                />
                <FieldProgress
                  label="Images"
                  icon={<Image className="h-4 w-4 text-green-500" />}
                  total={job.fields_summary?.images?.total || 0}
                  complete={job.fields_summary?.images?.complete || 0}
                />
                <FieldProgress
                  label="Pricing"
                  icon={<DollarSign className="h-4 w-4 text-yellow-500" />}
                  total={job.fields_summary?.pricing?.total || 0}
                  complete={job.fields_summary?.pricing?.complete || 0}
                />
                <FieldProgress
                  label="Metadata (HP, Types, Abilities)"
                  icon={<FileText className="h-4 w-4 text-purple-500" />}
                  total={job.fields_summary?.metadata?.total || 0}
                  complete={job.fields_summary?.metadata?.complete || 0}
                />
              </div>
            </div>

            {/* Current Set Details */}
            {currentSetProgress && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Current Set: {currentSetProgress.set_name}
                  </h4>
                  <Badge variant="outline">
                    {currentSetProgress.cards_processed}/{currentSetProgress.cards_total} cards
                  </Badge>
                </div>
                <Progress
                  value={
                    currentSetProgress.cards_total > 0
                      ? Math.round(
                          (currentSetProgress.cards_processed / currentSetProgress.cards_total) * 100
                        )
                      : 0
                  }
                  className="h-1.5"
                />
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-green-500">
                      {currentSetProgress.fields_completion?.core?.complete || 0}
                    </div>
                    <div className="text-muted-foreground">Core</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-500">
                      {currentSetProgress.fields_completion?.images?.complete || 0}
                    </div>
                    <div className="text-muted-foreground">Images</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-yellow-500">
                      {currentSetProgress.fields_completion?.pricing?.complete || 0}
                    </div>
                    <div className="text-muted-foreground">Prices</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-500">
                      {currentSetProgress.fields_completion?.metadata?.complete || 0}
                    </div>
                    <div className="text-muted-foreground">Metadata</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-500">
                      {currentSetProgress.fields_completion?.extended?.complete || 0}
                    </div>
                    <div className="text-muted-foreground">Extended</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Logs */}
            {logs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Recent Activity
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                  {logs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 p-1.5 rounded bg-muted/30"
                    >
                      {log.action === "inserted" && (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                      {log.action === "updated" && (
                        <Activity className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                      {log.action === "error" && (
                        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1">{log.card_name}</span>
                      <span className="text-muted-foreground">{log.set_name}</span>
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timing Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Started:{" "}
                  {job.started_at
                    ? new Date(job.started_at).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>
              <div>
                Estimated remaining: <span className="font-medium">{estimateRemainingTime(job)}</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

