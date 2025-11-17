import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const PayoutHistory = () => {
  const { user } = useAuth();

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

  const formatCurrency = (amount: number, currency: string = "GBP") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your payment history and payout status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <div className="text-center py-8 text-muted-foreground">
            <p>No payouts yet</p>
            <p className="text-sm mt-2">Payouts will appear here once you receive payments from sales</p>
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

