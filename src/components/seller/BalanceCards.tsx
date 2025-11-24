import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreditBalance } from "@/components/wallet/CreditBalance";

interface BalanceCardsProps {
  balance: {
    available_balance: number;
    pending_balance: number;
    currency: string;
  } | null;
  isLoading?: boolean;
}

export const BalanceCards = ({ balance, isLoading }: BalanceCardsProps) => {
  const navigate = useNavigate();

  if (isLoading || !balance) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
              <Wallet className="h-4 w-4 text-green-500" />Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
              <Clock className="h-4 w-4 text-yellow-500" />Pending Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Skeleton className="h-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
            <Wallet className="h-4 w-4 text-green-500" />Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-light tracking-tight">
            {balance.currency === "GBP" ? "£" : balance.currency || "£"}
            {(balance.available_balance || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-normal">Ready to withdraw</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate("/seller/account")}
          >
            View Payouts
          </Button>
        </CardContent>
      </Card>
      <Card className="border-yellow-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
            <Clock className="h-4 w-4 text-yellow-500" />Pending Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-light tracking-tight">
            {balance.currency === "GBP" ? "£" : balance.currency || "£"}
            {(balance.pending_balance || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-normal">Processing</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate("/seller/account")}
          >
            View Schedule
          </Button>
        </CardContent>
      </Card>
      
      <CreditBalance />
    </div>
  );
};