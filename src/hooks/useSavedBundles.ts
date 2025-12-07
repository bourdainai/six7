import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

/**
 * Hook for managing saved bundles
 * Uses the saved_listings table with a "bundle:" prefix to distinguish from regular listings
 */
export const useSavedBundles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all saved bundle IDs for the current user
  const { data: savedBundleIds = [], isLoading } = useQuery({
    queryKey: ["saved-bundles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // We store bundles with a "bundle:" prefix in the listing_id field
      const { data, error } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id)
        .like("listing_id", "bundle:%");

      if (error) throw error;
      // Remove the "bundle:" prefix when returning IDs
      return data.map((item) => item.listing_id.replace("bundle:", ""));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check if a specific bundle is saved
  const isSaved = (bundleId: string): boolean => {
    return savedBundleIds.includes(bundleId);
  };

  // Save a bundle
  const saveBundleMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      if (!user) throw new Error("Must be logged in to save bundles");

      const { error } = await supabase
        .from("saved_listings")
        .insert({
          user_id: user.id,
          listing_id: `bundle:${bundleId}`,
        });

      if (error) {
        // If it's a unique constraint violation, bundle is already saved
        if (error.code === "23505") {
          return; // Already saved, no error
        }
        throw error;
      }
    },
    onSuccess: (_, bundleId) => {
      // Optimistically update saved bundles cache
      queryClient.setQueryData(["saved-bundles", user?.id], (old: string[] = []) => {
        if (!old.includes(bundleId)) {
          return [...old, bundleId];
        }
        return old;
      });

      toast({
        title: "Saved",
        description: "Bundle added to your saved items",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to save bundle";
      if (import.meta.env.DEV) {
        logger.error("Error saving bundle:", error);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Unsave a bundle
  const unsaveBundleMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      if (!user) throw new Error("Must be logged in to unsave bundles");

      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", `bundle:${bundleId}`);

      if (error) throw error;
    },
    onSuccess: (_, bundleId) => {
      // Optimistically update saved bundles cache
      queryClient.setQueryData(["saved-bundles", user?.id], (old: string[] = []) => {
        return old.filter((id) => id !== bundleId);
      });

      toast({
        title: "Removed",
        description: "Bundle removed from your saved items",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to remove bundle";
      if (import.meta.env.DEV) {
        logger.error("Error unsaving bundle:", error);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Toggle save/unsave
  const toggleSave = (bundleId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items",
        variant: "destructive",
      });
      return;
    }

    if (isSaved(bundleId)) {
      unsaveBundleMutation.mutate(bundleId);
    } else {
      saveBundleMutation.mutate(bundleId);
    }
  };

  return {
    savedBundleIds,
    isSaved,
    saveBundle: saveBundleMutation.mutate,
    unsaveBundle: unsaveBundleMutation.mutate,
    toggleSave,
    isLoading,
    isSaving: saveBundleMutation.isPending,
    isUnsaving: unsaveBundleMutation.isPending,
  };
};

