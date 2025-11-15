import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const useAdminCheck = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-check", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },
  });
};
