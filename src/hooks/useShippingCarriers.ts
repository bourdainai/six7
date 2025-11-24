import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShippingCarrier {
  carrierCode: string;
  carrierName: string;
  serviceName: string;
  rate: number;
  currency: string;
  estimatedDays: number;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  metadata?: {
    carrier: string;
    service: string;
    minWeight?: number;
    maxWeight?: number;
    countries?: string[];
  };
}

interface UseShippingCarriersOptions {
  toCountry?: string;
  toPostalCode?: string;
  toCity?: string;
  weight?: number; // in grams
  enabled?: boolean;
}

export const useShippingCarriers = ({
  toCountry = 'GB',
  toPostalCode = '',
  toCity = '',
  weight = 100,
  enabled = true
}: UseShippingCarriersOptions = {}) => {
  return useQuery({
    queryKey: ['shipping-carriers', toCountry, toPostalCode, weight],
    enabled: enabled && !!toCountry && weight > 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sendcloud-get-rates', {
        body: {
          toCountry,
          toPostalCode,
          toCity,
          weight,
        }
      });

      if (error) throw error;
      
      return {
        rates: (data?.rates || []) as ShippingCarrier[],
        cached: data?.cached || false
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  });
};
