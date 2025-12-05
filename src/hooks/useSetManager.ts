import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export interface GitHubSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  updatedAt: string;
  images?: {
    symbol?: string;
    logo?: string;
  };
}

export interface SetCoverage {
  setId: string;
  setName: string;
  series: string;
  releaseDate: string;
  githubTotal: number;
  dbCount: number;
  coverage: number; // 0-100 percentage
  status: "missing" | "partial" | "complete";
}

export interface ImportActivity {
  isActive: boolean;
  recentInserts: number;
  lastInsertTime: Date | null;
}

export interface LiveCardInsert {
  id: string;
  cardId: string;
  name: string;
  setName: string;
  setCode: string;
  number: string;
  imageUrl: string | null;
  timestamp: Date;
}

export function useGitHubSets() {
  return useQuery({
    queryKey: ["github-sets"],
    queryFn: async () => {
      const response = await fetch(
        "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch sets from GitHub");
      }
      const sets: GitHubSet[] = await response.json();
      return sets;
    },
    staleTime: 3600000, // Cache for 1 hour
  });
}

export function useDatabaseSetCoverage() {
  return useQuery({
    queryKey: ["db-set-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pokemon_card_attributes")
        .select("set_code, sync_source");

      if (error) throw error;

      // Count cards per set
      const coverage: Record<string, number> = {};
      data?.forEach((card) => {
        if (card.set_code) {
          coverage[card.set_code] = (coverage[card.set_code] || 0) + 1;
        }
      });

      return coverage;
    },
  });
}

// Real-time subscription to track import activity with live card feed
export function useImportActivityTracker() {
  const queryClient = useQueryClient();
  const [activity, setActivity] = useState<ImportActivity>({
    isActive: false,
    recentInserts: 0,
    lastInsertTime: null,
  });
  const [totalCards, setTotalCards] = useState(0);
  const [liveCards, setLiveCards] = useState<LiveCardInsert[]>([]);
  const [currentSet, setCurrentSet] = useState<string | null>(null);

  // Fetch total card count
  const fetchTotalCount = useCallback(async () => {
    const { count } = await supabase
      .from("pokemon_card_attributes")
      .select("*", { count: "exact", head: true });
    setTotalCards(count || 0);
  }, []);

  useEffect(() => {
    fetchTotalCount();

    // Subscribe to real-time inserts
    const channel = supabase
      .channel("card-imports-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pokemon_card_attributes",
        },
        (payload) => {
          const newCard = payload.new as any;
          
          // Add to live cards feed (keep last 20)
          const liveCard: LiveCardInsert = {
            id: newCard.id || crypto.randomUUID(),
            cardId: newCard.card_id || "",
            name: newCard.name || "Unknown",
            setName: newCard.set_name || "Unknown Set",
            setCode: newCard.set_code || "",
            number: newCard.number || "",
            imageUrl: newCard.images?.small || newCard.images?.large || null,
            timestamp: new Date(),
          };

          setLiveCards((prev) => [liveCard, ...prev].slice(0, 20));
          setCurrentSet(newCard.set_name || null);

          setActivity((prev) => ({
            isActive: true,
            recentInserts: prev.recentInserts + 1,
            lastInsertTime: new Date(),
          }));
          setTotalCards((prev) => prev + 1);

          // Invalidate coverage queries to refresh data every 100 cards
          if ((activity.recentInserts + 1) % 100 === 0) {
            queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
          }
        }
      )
      .subscribe();

    // Check if activity has stopped (no inserts for 5 seconds)
    const inactivityCheck = setInterval(() => {
      setActivity((prev) => {
        if (prev.lastInsertTime) {
          const timeSinceLastInsert = Date.now() - prev.lastInsertTime.getTime();
          if (timeSinceLastInsert > 5000) {
            return { ...prev, isActive: false };
          }
        }
        return prev;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(inactivityCheck);
    };
  }, [queryClient, fetchTotalCount, activity.recentInserts]);

  const resetActivity = useCallback(() => {
    setActivity({
      isActive: false,
      recentInserts: 0,
      lastInsertTime: null,
    });
    setLiveCards([]);
    setCurrentSet(null);
  }, []);

  return { activity, totalCards, liveCards, currentSet, resetActivity, refetch: fetchTotalCount };
}

export function useSetCoverage() {
  const { data: githubSets, isLoading: githubLoading } = useGitHubSets();
  const { data: dbCoverage, isLoading: dbLoading } = useDatabaseSetCoverage();

  return useQuery({
    queryKey: ["set-coverage", githubSets, dbCoverage],
    queryFn: () => {
      if (!githubSets || !dbCoverage) return [];

      const coverage: SetCoverage[] = githubSets.map((set) => {
        const dbCount = dbCoverage[set.id] || 0;
        const coveragePercent =
          set.total > 0 ? Math.round((dbCount / set.total) * 100) : 0;

        let status: "missing" | "partial" | "complete";
        if (dbCount === 0) {
          status = "missing";
        } else if (coveragePercent >= 95) {
          status = "complete";
        } else {
          status = "partial";
        }

        return {
          setId: set.id,
          setName: set.name,
          series: set.series,
          releaseDate: set.releaseDate,
          githubTotal: set.total,
          dbCount,
          coverage: coveragePercent,
          status,
        };
      });

      // Sort by release date (newest first)
      return coverage.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return dateB - dateA;
      });
    },
    enabled: !!githubSets && !!dbCoverage,
  });
}

export function useImportSet() {
  return useMutation({
    mutationFn: async ({ setId, setName }: { setId: string; setName: string }) => {
      const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
        body: { setIds: [setId] },
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useImportMultipleSets() {
  return useMutation({
    mutationFn: async ({
      setIds,
      onProgress,
    }: {
      setIds: string[];
      onProgress?: (progress: {
        completed: number;
        total: number;
        current: string;
        imported: number;
        skipped: number;
      }) => void;
    }) => {
      const results = [];
      let totalImported = 0;
      let totalSkipped = 0;

      for (let i = 0; i < setIds.length; i++) {
        const setId = setIds[i];

        try {
          onProgress?.({
            completed: i,
            total: setIds.length,
            current: setId,
            imported: totalImported,
            skipped: totalSkipped,
          });

          const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
            body: { setIds: [setId] },
          });

          if (error) {
            results.push({ setId, success: false, error: error.message });
            continue;
          }

          totalImported += data?.stats?.totalImported || 0;
          totalSkipped += data?.stats?.totalSkipped || 0;

          results.push({
            setId,
            success: true,
            imported: data?.stats?.totalImported || 0,
            skipped: data?.stats?.totalSkipped || 0,
          });
        } catch (err) {
          results.push({
            setId,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      onProgress?.({
        completed: setIds.length,
        total: setIds.length,
        current: "",
        imported: totalImported,
        skipped: totalSkipped,
      });

      return {
        results,
        totalImported,
        totalSkipped,
      };
    },
  });
}

export interface ImportQueueProgress {
  completed: number;
  total: number;
  currentSet: { id: string; name: string } | null;
  totalCardsImported: number;
  totalCardsSkipped: number;
  errors: Array<{ setId: string; setName: string; error: string }>;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
}

export interface ImportQueueResult {
  success: boolean;
  completedSets: number;
  totalCardsImported: number;
  totalCardsSkipped: number;
  errors: Array<{ setId: string; setName: string; error: string }>;
}

export function useImportQueue() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportQueueProgress>({
    completed: 0,
    total: 0,
    currentSet: null,
    totalCardsImported: 0,
    totalCardsSkipped: 0,
    errors: [],
    isRunning: false,
    isPaused: false,
    isComplete: false,
  });
  const [queue, setQueue] = useState<Array<{ id: string; name: string }>>([]);
  const shouldStopRef = useRef(false);
  const startIndexRef = useRef(0);

  const startImport = useCallback(async (sets: Array<{ id: string; name: string }>, startFromIndex = 0) => {
    if (sets.length === 0) return;

    setQueue(sets);
    startIndexRef.current = startFromIndex;
    setProgress({
      completed: startFromIndex,
      total: sets.length,
      currentSet: null,
      totalCardsImported: 0,
      totalCardsSkipped: 0,
      errors: [],
      isRunning: true,
      isPaused: false,
      isComplete: false,
    });
    shouldStopRef.current = false;

    const errors: Array<{ setId: string; setName: string; error: string }> = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let completed = startFromIndex;

    // Process each set one at a time
    for (let i = startFromIndex; i < sets.length; i++) {
      // Check if stopped
      if (shouldStopRef.current) {
        setProgress((prev) => ({ ...prev, isRunning: false, isPaused: true }));
        break;
      }

      const set = sets[i];

      setProgress((prev) => ({
        ...prev,
        currentSet: set,
      }));

      try {
        // Call Edge Function for single set
        const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
          body: { setIds: [set.id] },
        });

        if (error) {
          console.error(`Error importing ${set.name}:`, error);
          const errorEntry = { setId: set.id, setName: set.name, error: error.message };
          errors.push(errorEntry);
          completed++;
          setProgress((prev) => ({
            ...prev,
            errors: [...prev.errors, errorEntry],
            completed,
          }));
          continue;
        }

        const imported = data?.stats?.totalImported || 0;
        const skipped = data?.stats?.totalSkipped || 0;
        totalImported += imported;
        totalSkipped += skipped;
        completed++;

        setProgress((prev) => ({
          ...prev,
          completed,
          totalCardsImported: totalImported,
          totalCardsSkipped: totalSkipped,
        }));

        // Small delay between sets to avoid overwhelming
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Refresh coverage stats every 5 sets
        if ((i + 1) % 5 === 0) {
          queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
        }
      } catch (err) {
        console.error(`Error importing ${set.name}:`, err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const errorEntry = { setId: set.id, setName: set.name, error: errorMsg };
        errors.push(errorEntry);
        completed++;
        setProgress((prev) => ({
          ...prev,
          errors: [...prev.errors, errorEntry],
          completed,
        }));
      }
    }

    // Refresh coverage data when done
    const wasStopped = shouldStopRef.current;
    if (!wasStopped) {
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["set-coverage"] });
    }

    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: wasStopped,
      isComplete: !wasStopped && completed >= sets.length,
      currentSet: null,
    }));

    return {
      success: errors.length === 0,
      completedSets: completed,
      totalCardsImported: totalImported,
      totalCardsSkipped: totalSkipped,
      errors,
    } as ImportQueueResult;
  }, [queryClient]);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    setProgress((prev) => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resume = useCallback(async () => {
    if (progress.isPaused && queue.length > 0 && progress.completed < queue.length) {
      const remaining = queue.slice(progress.completed);
      shouldStopRef.current = false;
      await startImport(remaining, progress.completed);
    }
  }, [progress.isPaused, progress.completed, queue, startImport]);

  const reset = useCallback(() => {
    setQueue([]);
    setProgress({
      completed: 0,
      total: 0,
      currentSet: null,
      totalCardsImported: 0,
      totalCardsSkipped: 0,
      errors: [],
      isRunning: false,
      isPaused: false,
      isComplete: false,
    });
    shouldStopRef.current = false;
    startIndexRef.current = 0;
  }, []);

  return {
    progress,
    startImport,
    stop,
    resume,
    reset,
  };
}

