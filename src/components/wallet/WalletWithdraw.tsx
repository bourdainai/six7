import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Loader2 } from "lucide-react";

interface WalletWithdrawProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
}

export function WalletWithdraw({ open, onOpenChange, balance }: WalletWithdrawProps) {
  const [amount, setAmount] = useState("");
  const { withdraw } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > balance) return;

    setIsLoading(true);
    try {
      await withdraw({ amount: val });
      onOpenChange(false);
      setAmount("");
    } catch (error) {
      console.error(error);
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
            Withdraw funds to your linked bank account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="withdraw-amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 relative">
              <span className="absolute left-3 top-2.5">£</span>
              <Input
                id="withdraw-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                type="number"
                min="1"
                max={balance}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            Available: £{balance.toFixed(2)}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleWithdraw} disabled={isLoading || !amount || parseFloat(amount) > balance}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

