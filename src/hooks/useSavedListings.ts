import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export const useSavedListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all saved listing IDs for the current user
  const { data: savedListingIds = [], isLoading } = useQuery({
    queryKey: ["saved-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((item) => item.listing_id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check if a specific listing is saved
  const isSaved = (listingId: string): boolean => {
    return savedListingIds.includes(listingId);
  };

  // Save a listing
  const saveListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) throw new Error("Must be logged in to save listings");

      const { error } = await supabase
        .from("saved_listings")
        .insert({
          user_id: user.id,
          listing_id: listingId,
        });

      if (error) {
        // If it's a unique constraint violation, listing is already saved
        if (error.code === "23505") {
          return; // Already saved, no error
        }
        throw error;
      }
    },
    onSuccess: (_, listingId) => {
      // Invalidate and refetch saved listings
      queryClient.setQueryData(["saved-listings", user?.id], (old: string[] = []) => {
        if (!old.includes(listingId)) {
          return [...old, listingId];
        }
        return old;
      });

      // Invalidate listing queries to update saves count
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["active-listings"] });

      toast({
        title: "Saved",
        description: "Item added to your saved items",
      });
    },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to save listing";
        if (import.meta.env.DEV) {
          console.error("Error saving listing:", error);
        }
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
    },
  });

  // Unsave a listing
  const unsaveListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) throw new Error("Must be logged in to unsave listings");

      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) throw error;
    },
    onSuccess: (_, listingId) => {
      // Update saved listings cache
      queryClient.setQueryData(["saved-listings", user?.id], (old: string[] = []) => {
        return old.filter((id) => id !== listingId);
      });

      // Invalidate listing queries to update saves count
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["active-listings"] });

      toast({
        title: "Removed",
        description: "Item removed from your saved items",
      });
    },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to remove listing";
        if (import.meta.env.DEV) {
          console.error("Error unsaving listing:", error);
        }
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
    },
  });

  // Toggle save/unsave
  const toggleSave = (listingId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items",
        variant: "destructive",
      });
      return;
    }

    if (isSaved(listingId)) {
      unsaveListingMutation.mutate(listingId);
    } else {
      saveListingMutation.mutate(listingId);
    }
  };

  return {
    savedListingIds,
    isSaved,
    saveListing: saveListingMutation.mutate,
    unsaveListing: unsaveListingMutation.mutate,
    toggleSave,
    isLoading,
    isSaving: saveListingMutation.isPending,
    isUnsaving: unsaveListingMutation.isPending,
  };
};

