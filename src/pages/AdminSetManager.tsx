import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SetImportTable } from "@/components/admin/SetImportTable";
import { SetImportProgress } from "@/components/admin/SetImportProgress";
import { ImportActivityDashboard } from "@/components/admin/ImportActivityDashboard";
import { ImportJobHistory } from "@/components/admin/ImportJobHistory";
import {
  useSetCoverage,
  useImportSet,
  useImportActivityTracker,
  useImportQueue,
  useJapaneseGitHubSets,
  useDatabaseSetCoverage,
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
  Loader2,
  Activity,
  Zap,
  History,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = "default",
}: {
  icon: LucideIcon;
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

function StatsSection({ sets, totalCardsInDB }: { sets: any[]; totalCardsInDB: number }) {
  if (!sets || sets.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
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
  const totalCardsInGitHub = sets.reduce((sum, s) => sum + s.githubTotal, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatsCard
        icon={Database}
        label="Cards in Database"
        value={totalCardsInDB}
        subValue={`of ${totalCardsInGitHub.toLocaleString()} available`}
        variant="default"
      />
      <StatsCard
        icon={Database}
        label="Total Sets"
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

type LanguageFilter = 'all' | 'english' | 'japanese';

export default function AdminSetManager() {
  const { data: sets, isLoading, refetch: refetchSets } = useSetCoverage();
  const { data: japaneseSets, isLoading: isLoadingJa } = useJapaneseGitHubSets();
  const { data: dbCoverage } = useDatabaseSetCoverage(); // Get actual DB coverage
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const { activity, totalCards, liveCards, currentSet, resetActivity, refetch: refetchTotalCards } = useImportActivityTracker();
  const importQueue = useImportQueue();
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  const importSetMutation = useImportSet();

  // Transform Japanese sets to coverage format with ACTUAL DB coverage
  const japaneseSetsAsCoverage = (japaneseSets || []).map((set) => {
    // Look up coverage from database (try both exact case and lowercase)
    const dbCount = dbCoverage?.[set.id] || dbCoverage?.[set.id.toLowerCase()] || dbCoverage?.[set.id.toUpperCase()] || 0;
    const total = set.printedTotal || set.total || 0;
    const coveragePercent = total > 0 ? Math.round((dbCount / total) * 100) : 0;
    
    let status: 'missing' | 'partial' | 'complete';
    if (dbCount === 0) {
      status = 'missing';
    } else if (coveragePercent >= 95) {
      status = 'complete';
    } else {
      status = 'partial';
    }
    
    return {
      setId: set.id,
      setName: set.name_en || set.name, // Display English name
      setNameOriginal: set.name, // Keep original Japanese name
      series: set.series,
      releaseDate: set.releaseDate || '',
      githubTotal: total,
      dbCount,
      coverage: coveragePercent,
      status,
      language: 'ja' as const,
    };
  });

  // Filter sets based on language selection
  const filteredSets = (() => {
    const englishSets = (sets || []).map(s => ({ ...s, language: 'en' as const }));
    
    switch (languageFilter) {
      case 'english':
        return englishSets;
      case 'japanese':
        return japaneseSetsAsCoverage;
      case 'all':
      default:
        return [...englishSets, ...japaneseSetsAsCoverage];
    }
  })();

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      await queryClient.invalidateQueries({ queryKey: ["set-coverage"] });
      await refetchTotalCards();
      await refetchSets();
      setLastRefreshed(new Date());
      toast({
        title: "Data refreshed",
        description: "Coverage statistics have been updated",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when activity detected
  useEffect(() => {
    if (activity.isActive && activity.recentInserts > 0 && activity.recentInserts % 50 === 0) {
      // Refresh every 50 cards imported
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
    }
  }, [activity.recentInserts, activity.isActive, queryClient]);

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
    // Find the set in filteredSets to get language info
    const setInfo = filteredSets?.find((s) => s.setId === setId);
    const setName = setInfo?.setName || setId;
    const language = (setInfo as any)?.language || 'en';

    // Reset activity tracker
    resetActivity();

    // Use queue system for consistency (even for single set)
    setShowProgressModal(true);
    await importQueue.startImport([{ id: setId, name: setName, language }]);

    toast({
      title: "Import complete",
      description: `Imported ${importQueue.progress.totalCardsImported.toLocaleString()} cards from ${setName}`,
    });
  };

  const handleRefreshSet = async (setId: string) => {
    await handleImportSet(setId);
  };

  const handleImportAllMissing = async () => {
    if (!filteredSets) return;

    const missingSets = filteredSets
      .filter((s) => s.status === "missing" || s.status === "partial")
      .map((s) => ({ id: s.setId, name: s.setName, language: (s as any).language || 'en' }));

    if (missingSets.length === 0) {
      toast({
        title: "Nothing to import",
        description: "All sets are already complete",
      });
      return;
    }

    const confirmed = window.confirm(
      `Import ${missingSets.length} sets one at a time? This will continue automatically until all sets are imported.\n\nEach set imports individually to avoid timeouts.`
    );
    if (!confirmed) return;

    // Reset activity tracker for fresh session
    resetActivity();

    // Open progress modal and start import
    setShowProgressModal(true);
    await importQueue.startImport(missingSets);

    // Show completion toast
    toast({
      title: "Import complete",
      description: `Imported ${importQueue.progress.totalCardsImported.toLocaleString()} cards from ${missingSets.length} sets`,
    });
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
    const setsToImport = setIds.map((id) => {
      const set = filteredSets?.find((s) => s.setId === id);
      return { id, name: set?.setName || id, language: (set as any)?.language || 'en' };
    });

    const confirmed = window.confirm(
      `Import ${setsToImport.length} selected set(s)? This will continue automatically until all sets are imported.`
    );
    if (!confirmed) return;

    // Reset activity tracker for fresh session
    resetActivity();

    // Open progress modal and start import
    setShowProgressModal(true);
    await importQueue.startImport(setsToImport);

    // Clear selection after import
    setSelectedSets(new Set());

    // Show completion toast
    toast({
      title: "Import complete",
      description: `Imported ${importQueue.progress.totalCardsImported.toLocaleString()} cards from ${setsToImport.length} sets`,
    });
  };

  const missingCount = filteredSets?.filter(
    (s) => s.status === "missing" || s.status === "partial"
  ).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Real-time Activity Banner */}
        {activity.isActive && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            <AlertTitle className="text-green-600 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Import in Progress
            </AlertTitle>
            <AlertDescription className="text-green-600">
              <div className="flex items-center gap-4">
                <span>
                  <strong>{activity.recentInserts.toLocaleString()}</strong> cards imported this session
                </span>
                <span className="text-green-500/70">
                  Total in database: <strong>{totalCards.toLocaleString()}</strong>
                </span>
                {activity.lastInsertTime && (
                  <span className="text-green-500/70 text-sm">
                    Last insert: {activity.lastInsertTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!activity.isActive && activity.recentInserts > 0 && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-600">Import Session Complete</AlertTitle>
            <AlertDescription className="text-blue-600">
              <div className="flex items-center justify-between">
                <span>
                  <strong>{activity.recentInserts.toLocaleString()}</strong> cards were imported. 
                  Total in database: <strong>{totalCards.toLocaleString()}</strong>
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { resetActivity(); handleRefresh(); }}
                  className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh & Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!activity.isActive && activity.recentInserts === 0 && (
          <Alert className="border-muted">
            <Database className="h-4 w-4" />
            <AlertTitle>No Active Import</AlertTitle>
            <AlertDescription>
              Click "Import" on a set below to start importing cards. 
              Real-time updates will appear here as cards are added to the database.
            </AlertDescription>
          </Alert>
        )}

        {/* Live Card Feed */}
        {(activity.isActive || liveCards.length > 0) && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className={`h-5 w-5 ${activity.isActive ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
                  <span className="font-semibold">
                    {activity.isActive ? "Live Import Feed" : "Recent Imports"}
                  </span>
                  {currentSet && activity.isActive && (
                    <Badge variant="outline" className="ml-2">
                      Currently: {currentSet}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {activity.recentInserts.toLocaleString()} cards this session
                </span>
              </div>
              
              {liveCards.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {liveCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        idx === 0 && activity.isActive
                          ? "bg-green-500/20 border border-green-500/30"
                          : "bg-muted/50"
                      }`}
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-10 h-14 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                          <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {card.setName} • #{card.number}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {card.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Waiting for cards...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enterprise Import Activity Dashboard */}
        <ImportActivityDashboard />

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
                  Import Pokemon card sets from GitHub repository (English & Japanese)
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            {selectedSets.size > 0 && (
              <Button
                onClick={handleImportSelected}
                disabled={importQueue.progress.isRunning}
              >
                <Download className="h-4 w-4 mr-2" />
                Import Selected ({selectedSets.size})
              </Button>
            )}
            {missingCount > 0 && (
              <Button
                onClick={handleImportAllMissing}
                disabled={importQueue.progress.isRunning}
              >
                <Download className="h-4 w-4 mr-2" />
                Import All Missing ({missingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Last Refreshed Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>
            Last refreshed: {lastRefreshed.toLocaleTimeString()} • 
            Total cards in database: <strong className="text-foreground">{totalCards.toLocaleString()}</strong>
          </span>
          {activity.isActive && (
            <Badge variant="outline" className="ml-2 animate-pulse border-green-500 text-green-500">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Language:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={languageFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguageFilter('all')}
            >
              All Sets ({(sets?.length || 0) + (japaneseSets?.length || 0)})
            </Button>
            <Button
              variant={languageFilter === 'english' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguageFilter('english')}
            >
              🇬🇧 English ({sets?.length || 0})
            </Button>
            <Button
              variant={languageFilter === 'japanese' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguageFilter('japanese')}
              disabled={isLoadingJa}
            >
              {isLoadingJa ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                '🇯🇵'
              )}{' '}
              Japanese ({japaneseSets?.length || 0})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsSection sets={filteredSets || []} totalCardsInDB={totalCards} />

        {/* Tabs for Sets vs Job History */}
        <Tabs defaultValue="sets" className="w-full">
          <TabsList>
            <TabsTrigger value="sets" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sets to Import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Import History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sets" className="mt-4">
            {/* Set Table */}
            <SetImportTable
              sets={filteredSets || []}
              isLoading={isLoading || isLoadingJa}
              onImportSet={handleImportSet}
              onRefreshSet={handleRefreshSet}
              selectedSets={selectedSets}
              onSetSelected={handleSetSelected}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <ImportJobHistory />
          </TabsContent>
        </Tabs>

        {/* Import Progress Modal */}
        <SetImportProgress
          open={showProgressModal}
          onOpenChange={(open) => {
            setShowProgressModal(open);
            if (!open && !importQueue.progress.isRunning) {
              // Reset on close if not running
              importQueue.reset();
              refetchTotalCards();
            }
          }}
          progress={importQueue.progress}
          onStop={importQueue.stop}
          onResume={importQueue.resume}
          onClose={() => {
            importQueue.reset();
            refetchTotalCards();
          }}
          liveCards={liveCards}
          totalCards={totalCards}
        />
      </div>
    </AdminLayout>
  );
}

