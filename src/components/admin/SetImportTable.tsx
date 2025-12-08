import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { SetCoverage, useImportSet } from "@/hooks/useSetManager";
import { Skeleton } from "@/components/ui/skeleton";

interface SetImportTableProps {
  sets: SetCoverage[];
  isLoading: boolean;
  onImportSet: (setId: string) => void;
  onRefreshSet: (setId: string) => void;
  selectedSets: Set<string>;
  onSetSelected: (setId: string, selected: boolean) => void;
}

function StatusBadge({ status }: { status: SetCoverage["status"] }) {
  const variants = {
    missing: {
      icon: XCircle,
      variant: "destructive" as const,
      label: "Missing",
    },
    partial: {
      icon: AlertTriangle,
      variant: "default" as const,
      label: "Partial",
    },
    complete: {
      icon: CheckCircle2,
      variant: "default" as const,
      label: "Complete",
    },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={
        status === "complete"
          ? "bg-green-500/20 text-green-600 border-green-500/30"
          : status === "partial"
          ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
          : ""
      }
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function CoverageBar({ coverage }: { coverage: number }) {
  const color =
    coverage >= 95
      ? "bg-green-500"
      : coverage >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.min(100, coverage)}%` }}
      />
    </div>
  );
}

export function SetImportTable({
  sets,
  isLoading,
  onImportSet,
  onRefreshSet,
  selectedSets,
  onSetSelected,
}: SetImportTableProps) {
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique series for filter
  const seriesList = Array.from(
    new Set(sets.map((set) => set.series))
  ).sort();

  // Filter sets
  const filteredSets = sets.filter((set) => {
    if (seriesFilter !== "all" && set.series !== seriesFilter) return false;
    if (statusFilter !== "all" && set.status !== statusFilter) return false;
    if (
      searchQuery &&
      !set.setName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !set.setId.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Group by series
  const groupedSets: Record<string, SetCoverage[]> = {};
  filteredSets.forEach((set) => {
    if (!groupedSets[set.series]) {
      groupedSets[set.series] = [];
    }
    groupedSets[set.series].push(set);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {seriesList.map((series) => (
              <SelectItem key={series} value={series}>
                {series}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sets grouped by series */}
      {Object.entries(groupedSets).map(([series, seriesSets]) => (
        <div key={series} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{series}</h3>
            <Badge variant="outline" className="text-xs">
              {seriesSets.length} set{seriesSets.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        seriesSets.length > 0 &&
                        seriesSets.every((s) => selectedSets.has(s.setId))
                      }
                      onCheckedChange={(checked) => {
                        seriesSets.forEach((set) =>
                          onSetSelected(set.setId, !!checked)
                        );
                      }}
                    />
                  </TableHead>
                  <TableHead>Set ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">GitHub</TableHead>
                  <TableHead className="text-right">Your DB</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesSets.map((set) => (
                  <TableRow key={set.setId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSets.has(set.setId)}
                        onCheckedChange={(checked) =>
                          onSetSelected(set.setId, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {set.setId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {set.setName}
                      {set.releaseDate && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(set.releaseDate).getFullYear() || 'Unknown'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {set.githubTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {set.dbCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px]">
                          <CoverageBar coverage={set.coverage} />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {set.coverage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={set.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {set.status === "complete" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRefreshSet(set.setId)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Refresh
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onImportSet(set.setId)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Import
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {filteredSets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No sets match your filters</p>
        </div>
      )}
    </div>
  );
}

