import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

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

// Complete Japanese set name mappings
// Only sets in this mapping AND in JAPANESE_SETS_WITH_DATA will be shown
const JAPANESE_SET_ENGLISH_NAMES: Record<string, string> = {
  // ===== SCARLET & VIOLET ERA (2023-Present) =====
  'SV11W': 'White Flare',
  'SV10': 'Team Rocket Glory',
  'SV9a': 'Hot Wind Arena',
  'SV9': 'Battle Partners',
  'SV8a': 'Terastal Fest ex',
  'SV8': 'Super Electric Breaker',
  'SV7a': 'Paradise Dragona',
  'SV7': 'Stellar Miracle',
  'SV6a': 'Night Wanderer',
  'SV6': 'Mask of Change',
  'SV5a': 'Crimson Haze',
  'SV5M': 'Cyber Judge',
  'SV5K': 'Wild Force',
  'SV4a': 'Shiny Treasure ex',
  'SV4M': 'Future Flash',
  'SV4K': 'Ancient Roar',
  'SV3a': 'Raging Surf',
  'SV3': 'Ruler of the Black Flame',
  'SV2a': 'Pokemon Card 151',
  'SV2P': 'Snow Hazard',
  'SV2D': 'Clay Burst',
  // 'SV1a': 'Triplet Beat', // No API data available
  'SV1V': 'Violet ex',
  'SV1S': 'Scarlet ex',
  'SVK': 'Stellar Miracle Deck Build Box',
  'SVLS': 'Starter Set Stellar Ceruledge ex',
  'SVLN': 'Starter Set Stellar Sylveon ex',
  
  // ===== SWORD & SHIELD ERA (Only sets with API data) =====
  'S12a': 'VSTAR Universe',
  'S12': 'Paradigm Trigger',
  'S9a': 'Battle Region',
  'S9': 'Star Birth',
  
  // ===== PCG ERA (EX Series) - All have API data =====
  'PCG1': 'Clash of the Blue Sky',
  'PCG2': 'Flight of Legends',
  'PCG3': 'Rocket Gang Strikes Back',
  'PCG4': 'Golden Sky, Silvery Ocean',
  'PCG5': 'Mirage Forest',
  'PCG6': 'Holon Research Tower',
  'PCG7': 'Holon Phantom',
  'PCG8': 'Miracle Crystal',
  'PCG9': 'Offense and Defense of the Furthest Ends',
  
  // ===== E-CARD ERA - All have API data =====
  'E1': 'Base Expansion Pack',
  'E2': 'The Town on No Map',
  'E3': 'Wind from the Sea',
  'E4': 'Split Earth',
  'E5': 'Mysterious Mountains',
  
  // ===== VS ERA - Have API data =====
  'VS1': 'Pokemon Card VS',
  'web1': 'Pokemon Card e-web',
  
  // ===== NEO ERA - All have API data =====
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',
  
  // ===== CLASSIC / PMCG ERA - All have API data =====
  'PMCG1': 'Expansion Pack (Base Set)',
  'PMCG2': 'Pokemon Jungle',
  'PMCG3': 'Mystery of the Fossils',
  'PMCG4': 'Team Rocket',
  'PMCG5': 'Leaders Stadium',
  'PMCG6': 'Challenge from the Darkness',
};

// Helper function to get English name (case-insensitive)
function getEnglishSetName(setCode: string): string | null {
  // Try exact match first
  if (JAPANESE_SET_ENGLISH_NAMES[setCode]) {
    return JAPANESE_SET_ENGLISH_NAMES[setCode];
  }
  // Try case-insensitive match
  const upperCode = setCode.toUpperCase();
  for (const [key, value] of Object.entries(JAPANESE_SET_ENGLISH_NAMES)) {
    if (key.toUpperCase() === upperCode) {
      return value;
    }
  }
  return null;
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
      // Mark as English sets
      return sets.map(set => ({ ...set, language: 'en' as const }));
    },
    staleTime: 3600000, // Cache for 1 hour
  });
}

/**
 * Japanese sets that are VERIFIED to have card data in TCGdex API
 * (Many sets return empty card arrays - only these actually have data)
 * Last verified: Dec 2024
 */
const JAPANESE_SETS_WITH_DATA = new Set([
  // Classic Era (PMCG) - All have data
  'PMCG1', 'PMCG2', 'PMCG3', 'PMCG4', 'PMCG5', 'PMCG6',
  // Neo Era - All have data
  'neo1', 'neo2', 'neo3', 'neo4',
  // VS / Web Era
  'VS1', 'web1',
  // E-Card Era - All have data
  'E1', 'E2', 'E3', 'E4', 'E5',
  // PCG Era - All have data
  'PCG1', 'PCG2', 'PCG3', 'PCG4', 'PCG5', 'PCG6', 'PCG7', 'PCG8', 'PCG9',
  // Sword & Shield Era - ONLY these 4 have data
  'S12a', 'S12', 'S9', 'S9a',
  // Scarlet & Violet Era - These have data
  'SV1S', 'SV1V', 'SV2a', 'SV2P', 'SV2D', 'SV3', 'SV3a',
  'SV4a', 'SV4K', 'SV4M', 'SV5a', 'SV5K', 'SV6', 'SV7', 'SV7a',
  'SV8', 'SV8a', 'SV9', 'SV9a', 'SV10', 'SV11W',
  'SVK', 'SVLS', 'SVLN',
]);

/**
 * Fetch Japanese sets from TCGdex API
 * Returns ONLY sets that:
 * 1. Have English translations mapped
 * 2. Actually have card data in the API (not empty)
 */
export function useJapaneseGitHubSets() {
  return useQuery({
    queryKey: ["github-sets-ja-v2"],
    queryFn: async () => {
      // Fetch from TCGdex API (one-time fetch, then cached)
      const response = await fetch("https://api.tcgdex.net/v2/ja/sets");
      if (!response.ok) {
        throw new Error("Failed to fetch Japanese sets from TCGdex");
      }
      const sets = await response.json();
      
      // Transform to GitHubSet format - ONLY include sets that:
      // 1. Have an English translation
      // 2. Have actual card data in the API
      const transformedSets: GitHubSet[] = [];
      
      for (const set of sets) {
        const englishName = getEnglishSetName(set.id);
        const hasCardData = JAPANESE_SETS_WITH_DATA.has(set.id);
        
        // Only include sets that have both English name AND card data
        if (englishName && hasCardData) {
          transformedSets.push({
            id: set.id,
            name: englishName, // Use English name as primary display
            name_en: englishName,
            series: set.serie?.name || 'Unknown',
            printedTotal: set.cardCount?.official || 0,
            total: set.cardCount?.total || 0,
            releaseDate: set.releaseDate || '',
            language: 'ja' as const,
            images: {
              logo: set.logo,
              symbol: set.symbol,
            }
          });
        }
      }
      
      logger.debug(`[useJapaneseGitHubSets] Found ${sets.length} total sets, ${transformedSets.length} have English translations AND card data`);
      
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

      logger.debug(`[useDatabaseSetCoverage] Fetched ${allCards.length} cards total`);

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
    mutationFn: async ({ setId, setName, language = 'en' }: { setId: string; setName: string; language?: 'en' | 'ja' }) => {
      // Use different import function based on language
      if (language === 'ja') {
        // Japanese sets use TCGdex API
        const { data, error } = await supabase.functions.invoke("import-tcgdex-set", {
          body: { setCode: setId, language: 'ja' },
        });
        if (error) throw error;
        return data;
      } else {
        // English sets use GitHub
        const { data, error } = await supabase.functions.invoke("import-github-pokemon-data", {
          body: { setIds: [setId] },
        });
        if (error) throw error;
        return data;
      }
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
  const [queue, setQueue] = useState<Array<{ id: string; name: string; language?: 'en' | 'ja' }>>([]);
  const shouldStopRef = useRef(false);

  const startImport = useCallback(async (sets: Array<{ id: string; name: string; language?: 'en' | 'ja' }>) => {
    if (sets.length === 0) return;

    logger.info(`Starting import of ${sets.length} set(s)`);
    
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
        logger.info(`Import paused by user at set ${i + 1}/${sets.length}`);
        setProgress((prev) => ({ ...prev, isRunning: false, isPaused: true }));
        break;
      }

      const set = sets[i];
      logger.info(`[${i + 1}/${sets.length}] Importing: ${set.name} (${set.id})`);

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
        // Use different function based on language
        const isJapanese = set.language === 'ja';
        logger.debug(`Calling Edge Function (${isJapanese ? 'Japanese/TCGdex' : 'English/GitHub'})...`);
        const startTime = Date.now();
        
        const { data, error } = isJapanese
          ? await supabase.functions.invoke("import-tcgdex-set", {
              body: { setCode: set.id, language: 'ja' },
            })
          : await supabase.functions.invoke("import-github-pokemon-data", {
              body: { setIds: [set.id], batchSize: 25 },
            });

        const duration = Date.now() - startTime;
        logger.debug(`Edge Function returned in ${duration}ms`);

        if (error) {
          logger.error(`Import error: ${error.message}`);
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

        logger.info(`Complete: ${imported} cards imported`);
        if (fieldCompletion.total > 0) {
          logger.debug(`Fields: Images=${fieldCompletion.images}/${fieldCompletion.total}, Pricing=${fieldCompletion.pricing}/${fieldCompletion.total}`);
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
        logger.error(`Import exception: ${err}`);
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
    logger.info(`Import ${wasStopped ? 'paused' : 'complete'}!`);
    logger.info(`Final: ${totalImported} cards from ${completed} sets`);

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
    logger.info("Stop requested");
    shouldStopRef.current = true;
    setProgress((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(async () => {
    if (progress.isPaused && queue.length > 0 && progress.completed < queue.length) {
      logger.info(`Resuming from set ${progress.completed + 1}`);
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
          const isJapanese = set.language === 'ja';
          const { data, error } = isJapanese
            ? await supabase.functions.invoke("import-tcgdex-set", {
                body: { setCode: set.id, language: 'ja' },
              })
            : await supabase.functions.invoke("import-github-pokemon-data", {
                body: { setIds: [set.id], batchSize: 25 },
              });

          if (!error) {
            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              totalCardsImported: prev.totalCardsImported + (data?.stats?.totalImported || data?.cardsImported || 0),
            }));
          }
          
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          logger.error(`Resume error for ${set.name}:`, err);
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
    logger.info("Reset import state");
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

