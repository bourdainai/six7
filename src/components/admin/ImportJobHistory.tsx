import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Image,
  DollarSign,
  FileText,
  Eye,
  History,
  Loader2,
} from "lucide-react";
import {
  useImportJobHistory,
  useImportSetProgress,
  formatDuration,
  ImportJob,
} from "@/hooks/useImportJobs";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    running: { variant: "default", className: "bg-blue-500" },
    pending: { variant: "secondary", className: "" },
    paused: { variant: "outline", className: "border-yellow-500 text-yellow-500" },
    completed: { variant: "default", className: "bg-green-500" },
    failed: { variant: "destructive", className: "" },
    cancelled: { variant: "outline", className: "text-muted-foreground" },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant={config.variant} className={config.className}>
      {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function JobDetailModal({ job, open, onClose }: { job: ImportJob | null; open: boolean; onClose: () => void }) {
  const { setProgress, isLoading: setsLoading } = useImportSetProgress(job?.id || null);

  if (!job) return null;

  // Calculate duration
  const duration = job.started_at && job.completed_at
    ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Import Job Details
            <StatusBadge status={job.status} />
          </DialogTitle>
          <DialogDescription>
            {job.job_type === "bulk_import" ? "Bulk import" : "Single set import"} from {job.source}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{job.sets_completed}</div>
              <div className="text-xs text-muted-foreground">Sets Completed</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{job.cards_imported.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Cards Imported</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">
                {job.avg_cards_per_second?.toFixed(1) || "-"}
              </div>
              <div className="text-xs text-muted-foreground">Cards/Second</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{duration ? formatDuration(duration) : "-"}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>

          {/* Field Completion */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Data Field Completion</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: "core", label: "Core", icon: <Database className="h-4 w-4 text-blue-500" /> },
                { key: "images", label: "Images", icon: <Image className="h-4 w-4 text-green-500" /> },
                { key: "pricing", label: "Pricing", icon: <DollarSign className="h-4 w-4 text-yellow-500" /> },
                { key: "metadata", label: "Metadata", icon: <FileText className="h-4 w-4 text-purple-500" /> },
                { key: "extended", label: "Extended", icon: <FileText className="h-4 w-4 text-gray-500" /> },
              ].map(({ key, label, icon }) => {
                const field = job.fields_summary?.[key as keyof typeof job.fields_summary];
                const percentage = field?.total > 0 ? Math.round((field.complete / field.total) * 100) : 0;
                return (
                  <div key={key} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      {icon}
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="text-xl font-bold">{percentage}%</div>
                    <Progress value={percentage} className="h-1.5 mt-1" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {field?.complete || 0}/{field?.total || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Set Progress */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Set Progress ({setProgress.length} sets)</h4>
            {setsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Set</TableHead>
                      <TableHead className="text-right">Cards</TableHead>
                      <TableHead className="text-right">Images</TableHead>
                      <TableHead className="text-right">Prices</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setProgress.map((sp) => {
                      const imgPct = sp.fields_completion?.images?.processed > 0
                        ? Math.round((sp.fields_completion.images.complete / sp.fields_completion.images.processed) * 100)
                        : 0;
                      const pricePct = sp.fields_completion?.pricing?.processed > 0
                        ? Math.round((sp.fields_completion.pricing.complete / sp.fields_completion.pricing.processed) * 100)
                        : 0;
                      return (
                        <TableRow key={sp.id}>
                          <TableCell className="font-medium">{sp.set_name}</TableCell>
                          <TableCell className="text-right">
                            {sp.cards_processed}/{sp.cards_total}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={imgPct === 100 ? "default" : "outline"} className={imgPct === 100 ? "bg-green-500" : ""}>
                              {imgPct}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={pricePct > 50 ? "default" : "outline"} className={pricePct > 50 ? "bg-yellow-500" : ""}>
                              {pricePct}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sp.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Timing */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Started: {job.started_at ? new Date(job.started_at).toLocaleString() : "-"}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed: {job.completed_at ? new Date(job.completed_at).toLocaleString() : "-"}
            </div>
          </div>

          {/* Errors */}
          {job.errors && job.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-500">Errors ({job.errors.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                {job.errors.map((err, idx) => (
                  <div key={idx} className="p-2 rounded bg-red-500/10 text-red-600">
                    {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImportJobHistory() {
  const { data: jobs, isLoading } = useImportJobHistory(10);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Import Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Sets</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        {job.job_type === "bulk_import" ? "Bulk" : "Single"}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.sets_completed}/{job.sets_total}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.cards_imported.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.started_at
                          ? new Date(job.started_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No import jobs yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <JobDetailModal
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  );
}

