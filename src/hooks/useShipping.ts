import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ShippingRate {
  carrierCode: string;
  carrierName: string;
  serviceName: string;
  rate: number;
  currency: string;
  estimatedDays: number;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  metadata?: any;
}

export interface ShippingLabel {
  id: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  carrier: string;
  status: string;
}

export interface ValidatedAddress {
  isValid: boolean;
  normalizedAddress?: {
    address: string;
    address2: string;
    city: string;
    postalCode: string;
    country: string;
  };
  details?: any;
}

export const useShipping = () => {
  const createLabel = useMutation({
    mutationFn: async ({
      orderId,
      carrierCode,
      servicePointId,
    }: {
      orderId: string;
      carrierCode?: string;
      servicePointId?: string;
    }): Promise<ShippingLabel> => {
      const { data, error } = await supabase.functions.invoke('sendcloud-create-label', {
        body: { orderId, carrierCode, servicePointId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create label');

      return data.parcel;
    },
    onError: (error: Error) => {
      toast.error('Failed to create shipping label', {
        description: error.message
      });
    },
    onSuccess: () => {
      toast.success('Shipping label created successfully');
    }
  });

  const getRates = async ({
    toCountry,
    toPostalCode,
    toCity,
    weight,
    declaredValue,
  }: {
    toCountry: string;
    toPostalCode: string;
    toCity: string;
    weight: number;
    declaredValue?: number;
  }): Promise<ShippingRate[]> => {
    const { data, error } = await supabase.functions.invoke('sendcloud-get-rates', {
      body: { toCountry, toPostalCode, toCity, weight, declaredValue }
    });

    if (error) {
      console.error('Failed to fetch shipping rates:', error);
      return [];
    }

    return data.rates || [];
  };

  const validateAddress = async (address: {
    address: string;
    address2?: string;
    city: string;
    postalCode: string;
    country: string;
  }): Promise<ValidatedAddress> => {
    const { data, error } = await supabase.functions.invoke('sendcloud-validate-address', {
      body: address
    });

    if (error) {
      console.error('Failed to validate address:', error);
      return { isValid: false };
    }

    return data;
  };

  const getParcelTracking = (orderId: string) => {
    return useQuery({
      queryKey: ['parcel-tracking', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('sendcloud_parcels')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        return data;
      },
      refetchInterval: 30000, // Refetch every 30 seconds
    });
  };

  return {
    createLabel,
    getRates,
    validateAddress,
    getParcelTracking,
  };
};

