import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Loader2 } from "lucide-react";
import { BankAccountSelector } from "./BankAccountSelector";
import { logger } from "@/lib/logger";
import { useMarketplace } from "@/contexts/MarketplaceContext";

interface WalletWithdrawProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
}

export function WalletWithdraw({ open, onOpenChange, balance }: WalletWithdrawProps) {
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const { withdraw } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const { currencySymbol } = useMarketplace();

  const MIN_WITHDRAWAL = 1;
  const MAX_WITHDRAWAL = 10000;

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    
    // Validation
    if (isNaN(val) || val < MIN_WITHDRAWAL) {
      logger.error(`Withdrawal amount must be at least ${currencySymbol}${MIN_WITHDRAWAL}`);
      return;
    }
    if (val > MAX_WITHDRAWAL) {
      logger.error(`Maximum withdrawal is ${currencySymbol}${MAX_WITHDRAWAL.toLocaleString()}`);
      return;
    }
    if (val > balance) {
      logger.error('Insufficient funds');
      return;
    }
    if (!bankAccountId) {
      logger.error('Please select a bank account');
      return;
    }

    setIsLoading(true);
    try {
      await withdraw({ amount: val, bank_account_id: bankAccountId });
      onOpenChange(false);
      setAmount("");
      setBankAccountId("");
    } catch (error) {
      logger.error('Withdrawal failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Withdraw funds to your linked bank account. Funds typically arrive in 1-2 business days.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <BankAccountSelector value={bankAccountId} onChange={setBankAccountId} />
          
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">{currencySymbol}</span>
              <Input
                id="withdraw-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                type="number"
                min={MIN_WITHDRAWAL}
                max={Math.min(balance, MAX_WITHDRAWAL)}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {currencySymbol}{MIN_WITHDRAWAL}</span>
              <span>Max: {currencySymbol}{MAX_WITHDRAWAL.toLocaleString()}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Available: {currencySymbol}{balance.toFixed(2)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleWithdraw} 
            disabled={
              isLoading || 
              !amount || 
              !bankAccountId ||
              parseFloat(amount) < MIN_WITHDRAWAL ||
              parseFloat(amount) > Math.min(balance, MAX_WITHDRAWAL)
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

