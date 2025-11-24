import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

interface CreditBalance {
  balance: number;
  lifetime_earned: number;
  lifetime_used: number;
}

interface PromoStatus {
  promo_code: string;
  credits_awarded: number;
  activated_at: string | null;
  first_listing_id: string | null;
}

interface CreditResponse {
  credits: CreditBalance;
  promo: PromoStatus | null;
  promoSlotsRemaining: number;
}

export const useCredits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: creditData, isLoading } = useQuery({
    queryKey: ["credits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<CreditResponse>(
        "credit-check-balance"
      );

      if (error) throw error;
      return data;
    },
  });

  const activatePromo = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "credit-activate-promo",
        {
          body: { listingId },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to activate promo: ${error.message}`);
    },
  });

  return {
    balance: creditData?.credits?.balance || 0,
    lifetimeEarned: creditData?.credits?.lifetime_earned || 0,
    lifetimeUsed: creditData?.credits?.lifetime_used || 0,
    promo: creditData?.promo,
    promoSlotsRemaining: creditData?.promoSlotsRemaining || 0,
    isLoading,
    activatePromo: activatePromo.mutate,
    isActivating: activatePromo.isPending,
  };
};