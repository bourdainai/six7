import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export interface GitHubSet {
  id: string;
  name: string;
  name_en?: string; // English name for Japanese sets
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  updatedAt?: string;
  language?: 'en' | 'ja';
  images?: {
    symbol?: string;
    logo?: string;
  };
}

// Japanese set name mappings (loaded from static file)
const JAPANESE_SET_ENGLISH_NAMES: Record<string, string> = {
  // Scarlet & Violet Era
  'sv8a': 'Terastal Fest ex',
  'sv7a': 'Stellar Miracle',
  'sv6a': 'Night Wanderer',
  'sv5a': 'Crimson Haze',
  'sv4a': 'Shiny Treasure ex',
  'sv4': 'Ancient Roar / Future Flash',
  'sv3a': 'Raging Surf',
  'sv3': 'Ruler of the Black Flame',
  'sv2a': 'Pokemon Card 151',
  'sv2': 'Snow Hazard / Clay Burst',
  'sv1a': 'Triplet Beat',
  'sv1': 'Scarlet ex / Violet ex',
  // Sword & Shield Era
  's12a': 'VSTAR Universe',
  's12': 'Paradigm Trigger',
  's11a': 'Incandescent Arcana',
  's11': 'Lost Abyss',
  's10a': 'Dark Fantasma',
  's10': 'Time Gazer / Space Juggler',
  's9a': 'Battle Region',
  's9': 'Star Birth',
  's8a': '25th Anniversary Collection',
  's8': 'Fusion Arts',
  's7R': 'Blue Sky Stream',
  's7D': 'Skyscraping Perfect',
  's6a': 'Eevee Heroes',
  's6H': 'Silver Lance',
  's6K': 'Jet Black Spirit',
  's5a': 'Matchless Fighters',
  's5R': 'Rapid Strike Master',
  's5I': 'Single Strike Master',
  's4a': 'Shiny Star V',
  's4': 'Astonishing Volt Tackle',
  's3a': 'Legendary Heartbeat',
  's3': 'Infinity Zone',
  's2a': 'Explosive Walker',
  's2': 'Rebellion Crash',
  's1a': 'VMAX Rising',
  's1H': 'Shield',
  's1W': 'Sword',
};

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
      // Mark as English sets
      return sets.map(set => ({ ...set, language: 'en' as const }));
    },
    staleTime: 3600000, // Cache for 1 hour
  });
}

/**
 * Fetch Japanese sets from TCGdex API
 * Returns sets with English names for display
 */
export function useJapaneseGitHubSets() {
  return useQuery({
    queryKey: ["github-sets-ja"],
    queryFn: async () => {
      // Fetch from TCGdex API (one-time fetch, then cached)
      const response = await fetch("https://api.tcgdex.net/v2/ja/sets");
      if (!response.ok) {
        throw new Error("Failed to fetch Japanese sets from TCGdex");
      }
      const sets = await response.json();
      
      // Transform to GitHubSet format with English names
      const transformedSets: GitHubSet[] = sets.map((set: any) => ({
        id: set.id,
        name: set.name, // Japanese name
        name_en: JAPANESE_SET_ENGLISH_NAMES[set.id] || set.name, // English name or fallback to Japanese
        series: set.serie?.name || 'Unknown',
        printedTotal: set.cardCount?.official || 0,
        total: set.cardCount?.total || 0,
        releaseDate: set.releaseDate || '',
        language: 'ja' as const,
        images: {
          logo: set.logo,
          symbol: set.symbol,
        }
      }));
      
      return transformedSets;
    },
    staleTime: 3600000, // Cache for 1 hour
  });
}

/**
 * Combined hook for all sets (English + Japanese)
 */
export function useAllGitHubSets() {
  const { data: englishSets, isLoading: isLoadingEn } = useGitHubSets();
  const { data: japaneseSets, isLoading: isLoadingJa } = useJapaneseGitHubSets();
  
  return {
    data: {
      english: englishSets || [],
      japanese: japaneseSets || [],
      all: [...(englishSets || []), ...(japaneseSets || [])],
    },
    isLoading: isLoadingEn || isLoadingJa,
  };
}

export function useDatabaseSetCoverage() {
  return useQuery({
    queryKey: ["db-set-coverage"],
    queryFn: async () => {
      // CRITICAL: Supabase limits to 1000 rows by default
      // We need to fetch ALL cards in batches to get accurate counts
      const BATCH_SIZE = 1000;
      let allCards: Array<{ set_code: string | null; sync_source: string | null }> = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pokemon_card_attributes")
          .select("set_code, sync_source")
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCards = allCards.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      console.log(`[useDatabaseSetCoverage] Fetched ${allCards.length} cards total`);

      // Count cards per set
      const coverage: Record<string, number> = {};
      allCards.forEach((card) => {
        if (card.set_code) {
          coverage[card.set_code] = (coverage[card.set_code] || 0) + 1;
        }
      });

      return coverage;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 30000, // Auto-refresh every 30 seconds
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
  totalCardsErrors: number;
  errors: Array<{ setId: string; setName: string; error: string }>;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  currentSetStats: {
    cardsProcessed: number;
    cardsTotal: number;
    fieldCompletion: {
      images: number;
      pricing: number;
      metadata: number;
    };
  } | null;
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
    totalCardsErrors: 0,
    errors: [],
    isRunning: false,
    isPaused: false,
    isComplete: false,
    currentSetStats: null,
  });
  const [queue, setQueue] = useState<Array<{ id: string; name: string }>>([]);
  const shouldStopRef = useRef(false);

  const startImport = useCallback(async (sets: Array<{ id: string; name: string }>) => {
    if (sets.length === 0) return;

    console.log(`🚀 Starting import of ${sets.length} set(s)`);
    
    setQueue(sets);
    setProgress({
      completed: 0,
      total: sets.length,
      currentSet: null,
      totalCardsImported: 0,
      totalCardsSkipped: 0,
      totalCardsErrors: 0,
      errors: [],
      isRunning: true,
      isPaused: false,
      isComplete: false,
      currentSetStats: null,
    });
    shouldStopRef.current = false;

    const errors: Array<{ setId: string; setName: string; error: string }> = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let completed = 0;

    // Process each set one at a time - DO NOT STOP UNTIL ALL COMPLETE
    for (let i = 0; i < sets.length; i++) {
      // Check if user requested stop
      if (shouldStopRef.current) {
        console.log(`⏸️ Import paused by user at set ${i + 1}/${sets.length}`);
        setProgress((prev) => ({ ...prev, isRunning: false, isPaused: true }));
        break;
      }

      const set = sets[i];
      console.log(`\n📦 [${i + 1}/${sets.length}] Importing: ${set.name} (${set.id})`);

      // Update progress with current set
      setProgress((prev) => ({
        ...prev,
        currentSet: set,
        currentSetStats: {
          cardsProcessed: 0,
          cardsTotal: 0,
          fieldCompletion: { images: 0, pricing: 0, metadata: 0 },
        },
      }));

      try {
        // Call Edge Function for this set - wait for full completion
        console.log(`   Calling Edge Function...`);
        const startTime = Date.now();
        
        const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
          body: { setIds: [set.id], batchSize: 25 },
        });

        const duration = Date.now() - startTime;
        console.log(`   Edge Function returned in ${duration}ms`);

        if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          const errorEntry = { setId: set.id, setName: set.name, error: error.message };
          errors.push(errorEntry);
          totalErrors++;
          completed++;
          
          setProgress((prev) => ({
            ...prev,
            errors: [...prev.errors, errorEntry],
            completed,
            totalCardsErrors: prev.totalCardsErrors + 1,
          }));
          continue;
        }

        // Extract stats from response
        const imported = data?.stats?.totalImported || 0;
        const skipped = data?.stats?.totalSkipped || 0;
        const setErrors = data?.stats?.totalErrors || 0;
        const fieldCompletion = data?.fieldCompletion || {};

        console.log(`   ✅ Complete: ${imported} cards imported`);
        if (fieldCompletion.total > 0) {
          console.log(`   📊 Fields: Images=${fieldCompletion.images}/${fieldCompletion.total}, Pricing=${fieldCompletion.pricing}/${fieldCompletion.total}`);
        }

        totalImported += imported;
        totalSkipped += skipped;
        totalErrors += setErrors;
        completed++;

        // Update progress
        setProgress((prev) => ({
          ...prev,
          completed,
          totalCardsImported: totalImported,
          totalCardsSkipped: totalSkipped,
          totalCardsErrors: totalErrors,
          currentSetStats: {
            cardsProcessed: imported,
            cardsTotal: imported,
            fieldCompletion: {
              images: fieldCompletion.images || 0,
              pricing: fieldCompletion.pricing || 0,
              metadata: fieldCompletion.metadata || 0,
            },
          },
        }));

        // Small delay between sets
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Refresh coverage stats every 3 sets
        if ((i + 1) % 3 === 0) {
          queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
        }
        
      } catch (err) {
        console.error(`   💥 Exception: ${err}`);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const errorEntry = { setId: set.id, setName: set.name, error: errorMsg };
        errors.push(errorEntry);
        totalErrors++;
        completed++;
        
        setProgress((prev) => ({
          ...prev,
          errors: [...prev.errors, errorEntry],
          completed,
          totalCardsErrors: prev.totalCardsErrors + 1,
        }));
      }
    }

    // Import loop complete
    const wasStopped = shouldStopRef.current;
    console.log(`\n🎉 Import ${wasStopped ? 'paused' : 'complete'}!`);
    console.log(`📊 Final: ${totalImported} cards from ${completed} sets`);

    // Refresh all coverage data
    queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
    queryClient.invalidateQueries({ queryKey: ["set-coverage"] });

    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: wasStopped,
      isComplete: !wasStopped && completed >= sets.length,
      currentSet: null,
      currentSetStats: null,
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
    console.log("⏸️ Stop requested");
    shouldStopRef.current = true;
    setProgress((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(async () => {
    if (progress.isPaused && queue.length > 0 && progress.completed < queue.length) {
      console.log(`▶️ Resuming from set ${progress.completed + 1}`);
      const remaining = queue.slice(progress.completed);
      shouldStopRef.current = false;
      
      // Update state for resume
      setProgress((prev) => ({
        ...prev,
        isRunning: true,
        isPaused: false,
      }));
      
      // Start from where we left off
      for (let i = 0; i < remaining.length; i++) {
        if (shouldStopRef.current) break;
        
        const set = remaining[i];
        setProgress((prev) => ({ ...prev, currentSet: set }));
        
        try {
          const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
            body: { setIds: [set.id], batchSize: 25 },
          });

          if (!error) {
            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              totalCardsImported: prev.totalCardsImported + (data?.stats?.totalImported || 0),
            }));
          }
          
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Resume error for ${set.name}:`, err);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["db-set-coverage"] });
      setProgress((prev) => ({
        ...prev,
        isRunning: false,
        isComplete: !shouldStopRef.current,
        currentSet: null,
      }));
    }
  }, [progress.isPaused, progress.completed, queue, queryClient]);

  const reset = useCallback(() => {
    console.log("🔄 Reset import state");
    setQueue([]);
    setProgress({
      completed: 0,
      total: 0,
      currentSet: null,
      totalCardsImported: 0,
      totalCardsSkipped: 0,
      totalCardsErrors: 0,
      errors: [],
      isRunning: false,
      isPaused: false,
      isComplete: false,
      currentSetStats: null,
    });
    shouldStopRef.current = false;
  }, []);

  return {
    progress,
    startImport,
    stop,
    resume,
    reset,
  };
}

