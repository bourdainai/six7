import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const useAdminCheck = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-check", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) {
        console.log("👤 [Admin Check] No user, returning false");
        return false;
      }

      console.log("🔍 [Admin Check] Checking admin status for user:", user.id);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(); // Use maybeSingle to avoid errors when no row exists

        if (error && error.code !== 'PGRST116') {
          console.error("❌ [Admin Check] Error:", error);
          throw error;
        }

        const isAdmin = !!data;
        console.log(isAdmin ? "✅ [Admin Check] User is admin" : "👤 [Admin Check] User is not admin");
        return isAdmin;
      } catch (err) {
        console.error("💥 [Admin Check] Unexpected error:", err);
        return false;
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
