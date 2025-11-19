import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useTradeOffers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['trade-offers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('trade_offers')
        .select(`
          *,
          target_listing:listings(*),
          buyer:profiles!buyer_id(*),
          seller:profiles!seller_id(*)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createOffer = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke('trade-create', {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Offer Sent", description: "Your trade offer has been sent!" });
      queryClient.invalidateQueries({ queryKey: ['trade-offers'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const acceptOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.functions.invoke('trade-accept', {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Offer Accepted", description: "Trade completed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['trade-offers'] });
    }
  });

  const rejectOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.functions.invoke('trade-reject', {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Offer Rejected" });
      queryClient.invalidateQueries({ queryKey: ['trade-offers'] });
    }
  });

  return {
    offers,
    isLoading,
    createOffer,
    acceptOffer,
    rejectOffer
  };
};

