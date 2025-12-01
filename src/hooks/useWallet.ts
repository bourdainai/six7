import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface WalletAccount {
  id: string;
  balance: number;
  pending_balance: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description: string;
}

export const useWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('wallet_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no wallet, it might be auto-created by backend, or we handle it here
        // For now, return null if not found
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as WalletAccount;
    },
  });

  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First get wallet id
      const { data: wallet } = await supabase
        .from('wallet_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!wallet) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!wallet,
  });

  const depositMutation = useMutation({
    mutationFn: async ({ amount, currency = 'gbp' }: { amount: number, currency?: string }) => {
      const { data, error } = await supabase.functions.invoke('wallet-deposit', {
        body: { amount, currency },
      });
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ amount, bank_account_id }: { amount: number, bank_account_id: string }) => {
      const { data, error } = await supabase.functions.invoke('wallet-withdraw', {
        body: { amount, bank_account_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Initiated",
        description: "Funds are on the way to your bank account.",
      });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    wallet,
    transactions,
    isLoading: isWalletLoading || isTransactionsLoading || isLoading,
    deposit: depositMutation.mutateAsync,
    withdraw: withdrawMutation.mutateAsync,
  };
};

