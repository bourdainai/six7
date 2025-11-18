import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Wallet, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PayoutHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select(`
          *,
          order:orders(id, total_amount, created_at)
        `)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - payouts don't change often
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your payment history and payout status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your payment history and payout status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No payouts yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Payouts will appear here once you receive payments from sales. Complete your seller onboarding to start receiving payments.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/seller/onboarding")}
            >
              Complete Onboarding
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout History</CardTitle>
        <CardDescription>View your payment history and payout status</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transfer ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell>
                  {payout.completed_at
                    ? format(new Date(payout.completed_at), "MMM d, yyyy")
                    : format(new Date(payout.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{payout.order_id.slice(0, 8)}...</span>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payout.amount, payout.currency)}
                </TableCell>
                <TableCell>{getStatusBadge(payout.status)}</TableCell>
                <TableCell>
                  {payout.stripe_transfer_id ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {payout.stripe_transfer_id.slice(0, 12)}...
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PayoutHistory;

