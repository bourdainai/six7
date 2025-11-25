import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { WalletDeposit } from "./WalletDeposit";
import { WalletWithdraw } from "./WalletWithdraw";
import { WalletErrorBoundary } from "./WalletErrorBoundary";

export function WalletBalance() {
  const { wallet, isLoading } = useWallet();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[150px] w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">£{wallet?.balance?.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">
            +£{wallet?.pending_balance?.toFixed(2) || '0.00'} pending
          </p>
          <div className="mt-4 flex space-x-2">
            <Button size="sm" className="flex-1" onClick={() => setIsDepositOpen(true)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Deposit
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsWithdrawOpen(true)}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <WalletErrorBoundary onReset={() => setIsDepositOpen(false)}>
        <WalletDeposit open={isDepositOpen} onOpenChange={setIsDepositOpen} />
      </WalletErrorBoundary>
      
      <WalletErrorBoundary onReset={() => setIsWithdrawOpen(false)}>
        <WalletWithdraw open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} balance={wallet?.balance || 0} />
      </WalletErrorBoundary>
    </>
  );
}

