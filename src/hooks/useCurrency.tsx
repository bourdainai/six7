import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  GBP: { GBP: 1, USD: 1.27, EUR: 1.17 },
  USD: { GBP: 0.79, USD: 1, EUR: 0.92 },
  EUR: { GBP: 0.85, USD: 1.09, EUR: 1 },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

export const useCurrency = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const preferredCurrency = profile?.preferred_currency || "GBP";

  const convertPrice = (amount: number, fromCurrency: string = "GBP") => {
    if (fromCurrency === preferredCurrency) return amount;
    
    const rate = EXCHANGE_RATES[fromCurrency]?.[preferredCurrency];
    if (!rate) return amount;
    
    return amount * rate;
  };

  const formatPrice = (amount: number, currency?: string) => {
    const displayCurrency = currency || preferredCurrency;
    const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  return {
    preferredCurrency,
    convertPrice,
    formatPrice,
    currencySymbol: CURRENCY_SYMBOLS[preferredCurrency] || preferredCurrency,
  };
};
