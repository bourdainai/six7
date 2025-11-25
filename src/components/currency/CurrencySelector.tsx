import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CircleDollarSign } from "lucide-react";

const CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound", icon: CircleDollarSign },
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  { code: "EUR", symbol: "€", name: "Euro", icon: CircleDollarSign },
];

export const CurrencySelector = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const updateCurrency = useMutation({
    mutationFn: async (currency: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_currency: currency })
        .eq("id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Currency updated",
        description: "Your preferred currency has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentCurrency = profile?.preferred_currency || "GBP";
  const CurrentIcon = CURRENCIES.find(c => c.code === currentCurrency)?.icon || CircleDollarSign;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Preferred Currency</label>
      <Select
        value={currentCurrency}
        onValueChange={(value) => updateCurrency.mutate(value)}
        disabled={updateCurrency.isPending}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-4 w-4" />
              {CURRENCIES.find(c => c.code === currentCurrency)?.name}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((currency) => {
            const Icon = currency.icon;
            return (
              <SelectItem key={currency.code} value={currency.code}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {currency.name} ({currency.symbol})
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Prices will be displayed in your preferred currency where possible
      </p>
    </div>
  );
};
