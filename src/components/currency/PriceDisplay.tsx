import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
}

// Simple exchange rates (in production, these would come from an API)
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

export const PriceDisplay = ({ amount, currency = "GBP", className = "" }: PriceDisplayProps) => {
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
  
  // Convert price if necessary
  let displayAmount = amount;
  let displayCurrency = currency;

  if (currency !== preferredCurrency && EXCHANGE_RATES[currency]?.[preferredCurrency]) {
    displayAmount = amount * EXCHANGE_RATES[currency][preferredCurrency];
    displayCurrency = preferredCurrency;
  }

  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  return (
    <span className={className}>
      {symbol}{displayAmount.toFixed(2)}
      {currency !== preferredCurrency && (
        <span className="text-xs text-muted-foreground ml-1">
          (≈{symbol}{displayAmount.toFixed(2)})
        </span>
      )}
    </span>
  );
};
