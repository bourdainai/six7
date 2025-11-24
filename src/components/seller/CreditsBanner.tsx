import { Gift, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useCredits } from "@/hooks/useCredits";

export const CreditsBanner = () => {
  const { balance, promo, promoSlotsRemaining } = useCredits();

  if (!promo || promo.activated_at) return null;

  const percentageFilled = ((250 - promoSlotsRemaining) / 250) * 100;

  return (
    <Alert className="border-primary bg-primary/5">
      <Gift className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        You're eligible for £200 in selling credits!
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Create your first listing to activate your promotional credits. 
          Zero fees on your first sales!
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{promoSlotsRemaining} spots remaining</span>
            <span>{250 - promoSlotsRemaining}/250 claimed</span>
          </div>
          <Progress value={percentageFilled} className="h-2" />
        </div>
      </AlertDescription>
    </Alert>
  );
};