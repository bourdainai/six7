import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Loader2 } from "lucide-react";

interface WalletDepositProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletDeposit({ open, onOpenChange }: WalletDepositProps) {
  const [amount, setAmount] = useState("");
  const { deposit } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleDeposit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setIsLoading(true);
    try {
      const result = await deposit({ amount: val });
      setClientSecret(result.clientSecret);
      // In a real app, you would now mount Stripe Elements with this clientSecret
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
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add funds to your 6Seven wallet to make instant purchases.
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-2.5">£</span>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  type="number"
                  min="1"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-4">Stripe Payment Intent created!</p>
            <p className="text-sm text-muted-foreground mb-4">Client Secret: {clientSecret.substring(0, 10)}...</p>
            <Button variant="outline" className="w-full">Complete Payment with Stripe</Button>
          </div>
        )}

        <DialogFooter>
          {!clientSecret && (
            <Button onClick={handleDeposit} disabled={isLoading || !amount}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

