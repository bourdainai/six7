import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Loader2, CheckCircle } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').catch((err) => {
  console.error('Failed to load Stripe:', err);
  return null;
});

interface WalletDepositProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Payment form component that uses Stripe Elements
function DepositPaymentForm({ 
  amount, 
  onSuccess, 
  onCancel 
}: { 
  amount: number; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?deposit=success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="py-4">
        <PaymentElement />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Deposit £{amount.toFixed(2)}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WalletDeposit({ open, onOpenChange }: WalletDepositProps) {
  const [amount, setAmount] = useState("");
  const { deposit } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [depositComplete, setDepositComplete] = useState(false);
  const [stripeLoadError, setStripeLoadError] = useState(false);
  const { toast } = useToast();

  // Check if Stripe loaded successfully - only when dialog opens
  useEffect(() => {
    if (!open) return;
    
    stripePromise.then((stripe) => {
      if (!stripe) {
        setStripeLoadError(true);
        toast({
          title: "Payment System Unavailable",
          description: "Unable to load payment system. Please check your internet connection or contact support.",
          variant: "destructive"
        });
      }
    });
  }, [open, toast]);

  const handleInitiateDeposit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setIsLoading(true);
    try {
      const result = await deposit({ amount: val });
      setClientSecret(result.clientSecret);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate deposit",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    setDepositComplete(true);
    toast({
      title: "Deposit Successful",
      description: "Your wallet balance will be updated shortly"
    });
    setTimeout(() => {
      onOpenChange(false);
      setClientSecret(null);
      setAmount("");
      setDepositComplete(false);
    }, 2000);
  };

  const handleCancel = () => {
    setClientSecret(null);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add funds to your 6Seven wallet to make instant purchases.
          </DialogDescription>
        </DialogHeader>

        {depositComplete ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <p className="text-lg font-medium">Deposit Successful!</p>
            <p className="text-sm text-muted-foreground">Your wallet balance is being updated...</p>
          </div>
        ) : !clientSecret ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInitiateDeposit} disabled={isLoading || !amount || stripeLoadError}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to Payment
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <DepositPaymentForm 
              amount={parseFloat(amount)} 
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

