import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/useAuth";

export const useWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch wallet data
  const {
    data: wallet,
    isLoading,
    refetch: refetchWallet,
    error,
  } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If wallet doesn't exist, return default values
      if (!data) {
        return {
          balance: 0,
          pending_balance: 0,
          currency: "gbp",
        };
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Fetch wallet transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  // Deposit mutation (calls Edge Function)
  const depositMutation = useMutation({
    mutationFn: async ({ amount, currency = "gbp" }) => {
      const { data, error } = await supabase.functions.invoke("wallet-deposit", {
        body: { amount, currency },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });

  // Withdraw mutation (calls Edge Function)
  const withdrawMutation = useMutation({
    mutationFn: async ({ amount, bank_account_id }) => {
      const { data, error } = await supabase.functions.invoke("wallet-withdraw", {
        body: { amount, bank_account_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });

  return {
    wallet,
    balance: wallet?.balance || 0,
    pendingBalance: wallet?.pending_balance || 0,
    currency: wallet?.currency || "gbp",
    transactions,
    isLoading,
    isLoadingTransactions,
    error,
    refetchWallet,
    deposit: depositMutation.mutateAsync,
    isDepositing: depositMutation.isPending,
    withdraw: withdrawMutation.mutateAsync,
    isWithdrawing: withdrawMutation.isPending,
  };
};


