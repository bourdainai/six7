import { useWallet, WalletTransaction } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function WalletTransactions() {
  const { transactions, isLoading } = useWallet();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'; // Primary/Black in shadcn
      case 'pending': return 'secondary'; // Gray
      case 'failed': return 'destructive'; // Red
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recent Transactions</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions?.map((tx: WalletTransaction) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(new Date(tx.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                  <TableCell>{tx.description || '-'}</TableCell>
                  <TableCell className={tx.amount > 0 ? "text-green-600 font-medium" : ""}>
                    {tx.amount > 0 ? '+' : ''}£{Math.abs(tx.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getStatusColor(tx.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

