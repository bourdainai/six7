import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const PayoutSchedule = () => {
  const { user } = useAuth();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["seller-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_balances")
        .select("*")
        .eq("seller_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" - that's okay, we'll create a default
        throw error;
      }
      return data || { available_balance: 0, pending_balance: 0, currency: "GBP" };
    },
    staleTime: 1000 * 60, // 1 minute - balance updates frequently
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  const { data: pendingPayouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["pending-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("seller_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    });
    return (amount: number, currency: string = "GBP") => {
      if (currency.toUpperCase() !== "GBP") {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: currency.toUpperCase(),
        }).format(amount);
      }
      return formatter.format(amount);
    };
  }, []);

  const { availableBalance, pendingBalance, currency, totalPending } = useMemo(() => {
    const avail = balance?.available_balance || 0;
    const pending = balance?.pending_balance || 0;
    const curr = balance?.currency || "GBP";
    const total = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return { availableBalance: avail, pendingBalance: pending, currency: curr, totalPending: total };
  }, [balance, pendingPayouts]);

  if (balanceLoading || payoutsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Schedule</CardTitle>
          <CardDescription>View your pending balance and payout schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-muted/50">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Schedule</CardTitle>
        <CardDescription>View your pending balance and payout schedule</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(availableBalance, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pending Balance</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(pendingBalance, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Processing</p>
          </div>
        </div>

        {/* Payout Information */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Payout Information
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payout Frequency:</span>
              <span className="font-medium">Instant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Payouts:</span>
              <span className="font-medium">{pendingPayouts?.length || 0}</span>
            </div>
            {totalPending > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pending:</span>
                <span className="font-medium">{formatCurrency(totalPending, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Payouts List */}
        {pendingPayouts && pendingPayouts.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Pending Payouts</h4>
            <div className="space-y-2">
              {pendingPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{formatCurrency(payout.amount, payout.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(payout.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Processing...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!pendingPayouts || pendingPayouts.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-1">No pending payouts</h4>
            <p className="text-sm text-muted-foreground">
              Pending payouts will appear here once orders are processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutSchedule;

