import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, CheckCircle2, AlertCircle, Clock, Database } from "lucide-react";
import { toast } from "sonner";

interface ImportProgress {
  set_code: string;
  language: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  cards_imported: number;
  total_cards: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface SetInfo {
  set_code: string;
  set_name: string;
  existing_cards: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export default function AdminCardRestoration() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentSet, setCurrentSet] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch Japanese sets that need restoration
  const { data: setsToRestore, isLoading, error: queryError } = useQuery({
    queryKey: ['japanese-sets-to-restore'],
    queryFn: async () => {
      console.log('🔍 Fetching TCGdex sets...');
      
      // Get all TCGdex cards with aggregated counts
      const { data: allSets, error } = await supabase
        .from('pokemon_card_attributes')
        .select('set_code, set_name, sync_source')
        .eq('sync_source', 'tcgdex');

      if (error) {
        console.error('❌ Error fetching sets:', error);
        throw error;
      }

      console.log(`✅ Found ${allSets?.length || 0} TCGdex cards total`);

      // Group by set and count cards
      const setMap = new Map<string, { name: string; count: number }>();
      allSets?.forEach(card => {
        const existing = setMap.get(card.set_code) || { name: card.set_name, count: 0 };
        setMap.set(card.set_code, { name: existing.name, count: existing.count + 1 });
      });

      console.log(`📦 Grouped into ${setMap.size} unique sets`);

      // Get import progress
      const setCodes = Array.from(setMap.keys());
      const { data: progressData } = await supabase
        .from('tcgdex_import_progress')
        .select('*')
        .in('set_code', setCodes)
        .eq('language', 'ja');

      const progressMap = new Map(
        (progressData || []).map(p => [p.set_code, p])
      );

      const result = Array.from(setMap.entries()).map(([set_code, info]) => {
        const progress = progressMap.get(set_code);
        // If no progress entry but cards exist, mark as completed
        const status = progress?.status || (info.count > 0 ? 'completed' : 'pending');
        return {
          set_code,
          set_name: info.name,
          existing_cards: info.count,
          status
        } as SetInfo;
      });

      console.log(`📊 Final result: ${result.length} sets processed`);
      return result;
    },
    refetchInterval: isRestoring ? 3000 : false,
  });

  // Log query state for debugging
  useEffect(() => {
    if (queryError) {
      console.error('Query Error:', queryError);
      toast.error('Failed to load sets: ' + (queryError as Error).message);
    }
    if (setsToRestore) {
      console.log('Sets loaded:', setsToRestore.length);
    }
  }, [queryError, setsToRestore]);

  // Log query state for debugging
  useEffect(() => {
    if (queryError) {
      console.error('❌ Query Error:', queryError);
      toast.error('Failed to load sets: ' + (queryError as Error).message);
    }
    if (setsToRestore) {
      console.log('✅ Sets loaded:', setsToRestore.length, 'sets');
    }
    if (isLoading) {
      console.log('⏳ Loading sets...');
    }
  }, [queryError, setsToRestore, isLoading]);

  // Import progress for real-time stats
  const { data: overallProgress } = useQuery({
    queryKey: ['import-progress-stats'],
    queryFn: async () => {
      // Get actual card counts from database
      const { data: cardData, error: cardError } = await supabase
        .from('pokemon_card_attributes')
        .select('id', { count: 'exact', head: true })
        .eq('sync_source', 'tcgdex');

      if (cardError) throw cardError;

      const totalCards = cardData || 0;

      // Get progress data for status counts
      const { data, error } = await supabase
        .from('tcgdex_import_progress')
        .select('*')
        .eq('language', 'ja');

      if (error) throw error;

      const completed = data.filter(p => p.status === 'completed').length;
      const inProgress = data.filter(p => p.status === 'in_progress').length;
      const failed = data.filter(p => p.status === 'failed').length;

      return {
        completed,
        inProgress,
        failed,
        totalCards: typeof totalCards === 'number' ? totalCards : 0,
        totalSets: data.length,
      };
    },
    refetchInterval: isRestoring ? 3000 : false,
  });

  // Mutation to import a single set
  const importSetMutation = useMutation({
    mutationFn: async ({ setCode, language }: { setCode: string; language: string }) => {
      const { data, error } = await supabase.functions.invoke('import-tcgdex-set', {
        body: { setCode, language },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Imported ${data.cardsImported} cards from ${variables.setCode}`);
      queryClient.invalidateQueries({ queryKey: ['japanese-sets-to-restore'] });
      queryClient.invalidateQueries({ queryKey: ['import-progress-stats'] });
    },
    onError: (error: any, variables) => {
      toast.error(`Failed to import ${variables.setCode}: ${error.message}`);
    },
  });

  // Start restoration process
  const startRestoration = async () => {
    if (!setsToRestore) return;

    setIsRestoring(true);
    const pendingSets = setsToRestore.filter(s => s.status === 'pending' || s.status === 'failed');

    toast.info(`Starting restoration of ${pendingSets.length} sets...`);

    for (const set of pendingSets) {
      if (!isRestoring) break; // Allow stopping

      setCurrentSet(set.set_code);
      
      try {
        await importSetMutation.mutateAsync({
          setCode: set.set_code,
          language: 'ja',
        });

        // Small delay between imports to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to import ${set.set_code}:`, error);
        // Continue with next set even if one fails
      }
    }

    setIsRestoring(false);
    setCurrentSet(null);
    toast.success('Restoration process completed!');
  };

  const stopRestoration = () => {
    setIsRestoring(false);
    setCurrentSet(null);
    toast.info('Restoration paused. You can resume anytime.');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, text: 'Pending' },
      in_progress: { variant: 'default' as const, icon: Play, text: 'In Progress' },
      completed: { variant: 'outline' as const, icon: CheckCircle2, text: 'Completed' },
      failed: { variant: 'destructive' as const, icon: AlertCircle, text: 'Failed' },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const pendingCount = setsToRestore?.filter(s => s.status === 'pending' || s.status === 'failed').length || 0;
  const completedCount = setsToRestore?.filter(s => s.status === 'completed').length || 0;
  const progressPercentage = setsToRestore ? (completedCount / setsToRestore.length) * 100 : 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pokemon Card Restoration</h1>
          <p className="text-muted-foreground">
            Enterprise-grade Japanese TCGdex card restoration dashboard
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{setsToRestore?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallProgress?.totalCards || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle>Restoration Progress</CardTitle>
            <CardDescription>
              {isRestoring ? `Currently importing: ${currentSet}` : 'Ready to start restoration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} />
            </div>

            <div className="flex gap-2">
              {!isRestoring ? (
                <Button
                  onClick={startRestoration}
                  disabled={pendingCount === 0 || isLoading}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {completedCount > 0 ? 'Resume Restoration' : 'Start Restoration'}
                </Button>
              ) : (
                <Button
                  onClick={stopRestoration}
                  variant="destructive"
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause Restoration
                </Button>
              )}
            </div>

            {pendingCount === 0 && !isRestoring && completedCount > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  All {setsToRestore?.length || 0} Japanese TCGdex sets ({overallProgress?.totalCards || 0} cards) have been successfully imported! 🎉
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Japanese Sets Status
            </CardTitle>
            <CardDescription>
              Detailed status of each Japanese TCGdex set
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading sets...</div>
              ) : setsToRestore?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No Japanese sets found</div>
              ) : (
                setsToRestore?.map((set) => (
                  <div
                    key={set.set_code}
                    className={`p-4 border rounded-lg flex items-center justify-between transition-colors ${
                      currentSet === set.set_code ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{set.set_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {set.set_code} • {set.existing_cards} cards in database
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(set.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
