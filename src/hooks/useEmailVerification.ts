import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const useEmailVerification = () => {
  const { user } = useAuth();

  const { data: authUser, isLoading } = useQuery({
    queryKey: ["auth-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      return authUser;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  const isVerified = authUser?.email_confirmed_at !== null && authUser?.email_confirmed_at !== undefined;

  return {
    isVerified,
    isLoading,
    email: authUser?.email || user?.email,
  };
};
