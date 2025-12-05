import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

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

// Real-time subscription to track import activity
export function useImportActivityTracker() {
  const queryClient = useQueryClient();
  const [activity, setActivity] = useState<ImportActivity>({
    isActive: false,
    recentInserts: 0,
    lastInsertTime: null,
  });
  const [totalCards, setTotalCards] = useState(0);

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
      .channel("card-imports")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pokemon_card_attributes",
        },
        (payload) => {
          setActivity((prev) => ({
            isActive: true,
            recentInserts: prev.recentInserts + 1,
            lastInsertTime: new Date(),
          }));
          setTotalCards((prev) => prev + 1);

          // Invalidate coverage queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
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
  }, [queryClient, fetchTotalCount]);

  const resetActivity = useCallback(() => {
    setActivity({
      isActive: false,
      recentInserts: 0,
      lastInsertTime: null,
    });
  }, []);

  return { activity, totalCards, resetActivity, refetch: fetchTotalCount };
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

