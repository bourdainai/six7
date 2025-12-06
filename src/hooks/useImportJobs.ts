import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

// Types for import job tracking
export interface FieldCompletion {
  total: number;
  complete: number;
}

export interface FieldsSummary {
  core: FieldCompletion;
  images: FieldCompletion;
  pricing: FieldCompletion;
  metadata: FieldCompletion;
  extended: FieldCompletion;
}

export interface ImportJob {
  id: string;
  job_type: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  sets_total: number;
  sets_completed: number;
  sets_failed: number;
  cards_total: number;
  cards_imported: number;
  cards_updated: number;
  cards_skipped: number;
  cards_failed: number;
  current_set_id: string | null;
  current_set_name: string | null;
  current_card_id: string | null;
  current_card_name: string | null;
  fields_summary: FieldsSummary;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
  estimated_completion: string | null;
  avg_cards_per_second: number | null;
  errors: Array<{ message: string; timestamp: string }>;
  warnings: Array<{ message: string; timestamp: string }>;
  source: string;
  initiated_by: string | null;
  metadata: Record<string, any>;
}

export interface ImportSetProgress {
  id: string;
  job_id: string;
  set_id: string;
  set_name: string;
  status: "pending" | "running" | "completed" | "failed";
  cards_total: number;
  cards_processed: number;
  cards_inserted: number;
  cards_updated: number;
  cards_skipped: number;
  cards_failed: number;
  fields_completion: {
    core: { processed: number; complete: number; missing: number };
    images: { processed: number; complete: number; missing: number };
    pricing: { processed: number; complete: number; missing: number };
    metadata: { processed: number; complete: number; missing: number };
    extended: { processed: number; complete: number; missing: number };
  };
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  errors: Array<{ message: string; timestamp: string }>;
}

export interface ImportLog {
  id: string;
  job_id: string;
  set_id: string;
  set_name: string;
  card_id: string;
  card_name: string;
  card_number: string;
  action: "inserted" | "updated" | "skipped" | "error" | "processed";
  reason: string | null;
  fields_processed: {
    core: boolean;
    images: boolean;
    pricing: boolean;
    metadata: boolean;
    extended: boolean;
  };
  field_details: Record<string, boolean>;
  duration_ms: number | null;
  timestamp: string;
}

// Helper to map database row to ImportJob type
function mapToImportJob(data: any): ImportJob {
  return {
    id: data.id,
    job_type: data.source || 'unknown',
    status: data.status as ImportJob['status'],
    sets_total: 0,
    sets_completed: 0,
    sets_failed: 0,
    cards_total: data.total_items || 0,
    cards_imported: data.processed_items || 0,
    cards_updated: 0,
    cards_skipped: 0,
    cards_failed: data.failed_items || 0,
    current_set_id: null,
    current_set_name: null,
    current_card_id: null,
    current_card_name: null,
    fields_summary: {
      core: { total: 0, complete: 0 },
      images: { total: 0, complete: 0 },
      pricing: { total: 0, complete: 0 },
      metadata: { total: 0, complete: 0 },
      extended: { total: 0, complete: 0 },
    },
    started_at: data.created_at,
    updated_at: data.created_at,
    completed_at: data.completed_at,
    estimated_completion: null,
    avg_cards_per_second: null,
    errors: [],
    warnings: [],
    source: data.source || 'unknown',
    initiated_by: data.user_id,
    metadata: data.metadata || {},
  };
}

// Hook to get active import job
export function useActiveImportJob() {
  const [job, setJob] = useState<ImportJob | null>(null);

  // Initial fetch
  const { data: initialJob, isLoading, refetch } = useQuery({
    queryKey: ["active-import-job"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .in("status", ["pending", "running", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data ? mapToImportJob(data) : null;
    },
    refetchInterval: 5000, // Poll every 5 seconds as backup
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("import-job-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_jobs",
        },
        (payload) => {
          const updatedJob = mapToImportJob(payload.new);
          if (payload.eventType === "DELETE") {
            setJob(null);
          } else if (["pending", "running", "paused"].includes(updatedJob.status)) {
            setJob(updatedJob);
          } else if (updatedJob.status === "completed" || updatedJob.status === "failed") {
            setJob(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync initial data
  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  return { job, isLoading, refetch };
}

// Hook to get import job by ID with real-time updates
export function useImportJob(jobId: string | null) {
  const [job, setJob] = useState<ImportJob | null>(null);

  const { data: initialJob, isLoading } = useQuery({
    queryKey: ["import-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return mapToImportJob(data);
    },
    enabled: !!jobId,
    refetchInterval: 2000, // Poll every 2 seconds for active jobs
  });

  // Real-time subscription for specific job
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`import-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setJob(null);
          } else {
            setJob(mapToImportJob(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  return { job: job || initialJob, isLoading };
}

// Hook to get set progress for a job - simplified version without real-time for now
export function useImportSetProgress(jobId: string | null) {
  const [setProgress, setSetProgress] = useState<ImportSetProgress[]>([]);

  const { data: initialData, isLoading, refetch } = useQuery({
    queryKey: ["import-set-progress", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      // Return empty array since we don't have this table in the current schema
      return [] as ImportSetProgress[];
    },
    enabled: !!jobId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (initialData) {
      setSetProgress(initialData);
    }
  }, [initialData]);

  return { setProgress, isLoading, refetch };
}

// Hook to get recent import logs - simplified version
export function useImportLogs(jobId: string | null, limit = 50) {
  const [logs, setLogs] = useState<ImportLog[]>([]);

  const { data: initialLogs, isLoading } = useQuery({
    queryKey: ["import-logs", jobId, limit],
    queryFn: async () => {
      if (!jobId) return [];
      // Return empty array since we don't have this table in the current schema
      return [] as ImportLog[];
    },
    enabled: !!jobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  return { logs, isLoading };
}

// Hook to get job history
export function useImportJobHistory(limit = 20) {
  return useQuery({
    queryKey: ["import-job-history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(mapToImportJob);
    },
    staleTime: 30000,
  });
}

// Hook to get field completion stats
export function useFieldCompletionStats() {
  return useQuery({
    queryKey: ["field-completion-stats"],
    queryFn: async () => {
      // Get counts of cards with/without various fields
      const { data: totalCount } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true });

      const { data: withImages } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .not("images", "is", null)
        .not("images->small", "is", null);

      const { data: withPricing } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .or("tcgplayer_prices.not.is.null,cardmarket_prices.not.is.null");

      const { data: withMetadata } = await supabase
        .from("pokemon_card_attributes")
        .select("*", { count: "exact", head: true })
        .not("metadata", "is", null)
        .not("metadata->hp", "is", null);

      return {
        total: totalCount || 0,
        withImages: withImages || 0,
        withPricing: withPricing || 0,
        withMetadata: withMetadata || 0,
      };
    },
    staleTime: 60000,
  });
}

// Calculate completion percentages
export function calculateFieldPercentage(summary: FieldsSummary | null, field: keyof FieldsSummary): number {
  if (!summary || !summary[field] || summary[field].total === 0) return 0;
  return Math.round((summary[field].complete / summary[field].total) * 100);
}

// Format duration
export function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

// Estimate remaining time
export function estimateRemainingTime(job: ImportJob | null): string {
  if (!job || !job.avg_cards_per_second || job.avg_cards_per_second === 0) return "Calculating...";
  
  const remainingCards = job.cards_total - job.cards_imported;
  const remainingSeconds = remainingCards / job.avg_cards_per_second;
  
  return formatDuration(remainingSeconds * 1000);
}
