import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingStatusCardsProps {
  profile: {
    stripe_connect_account_id?: string | null;
    stripe_onboarding_complete?: boolean | null;
    can_receive_payments?: boolean | null;
  } | null;
  onStartOnboarding: () => void;
  isOnboardingLoading: boolean;
}

export const OnboardingStatusCards = ({ 
  profile, 
  onStartOnboarding, 
  isOnboardingLoading 
}: OnboardingStatusCardsProps) => {
  const navigate = useNavigate();

  if (!profile?.stripe_connect_account_id) {
    return (
      <Card className="border-amber-500 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Complete Seller Setup
          </CardTitle>
          <CardDescription className="font-normal">
            Set up your payment details to start receiving payments from buyers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 font-normal">
            You need to complete Stripe Connect onboarding before you can receive payments. This process takes
            just a few minutes.
          </p>
          <Button 
            onClick={onStartOnboarding} 
            disabled={isOnboardingLoading}
            aria-label="Start seller onboarding process"
          >
            {isOnboardingLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Starting...
              </>
            ) : (
              "Start Onboarding"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.stripe_onboarding_complete) {
    return (
      <Card className="border-yellow-500 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Onboarding In Progress
          </CardTitle>
          <CardDescription className="font-normal">
            Your payment account setup is in progress. Complete verification to start receiving payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 font-normal">
            You may need to provide additional information or upload documents to complete verification.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/seller/onboarding")} variant="outline">
              Continue Onboarding
            </Button>
            <Button onClick={() => navigate("/seller/account")} variant="outline">
              Check Verification Status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.can_receive_payments) {
    return (
      <Card className="border-yellow-500 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Verification Pending
          </CardTitle>
          <CardDescription className="font-normal">
            Your onboarding is complete, but your account is still being verified by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 font-normal">
            This usually takes a few minutes. You'll be able to receive payments once verification is complete.
          </p>
          <Button onClick={() => navigate("/seller/account")} variant="outline">
            Check Verification Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500 bg-green-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-normal tracking-tight">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Payment Account Active
        </CardTitle>
        <CardDescription className="font-normal">
          Your payment account is set up and ready to receive payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => navigate("/seller/account")} variant="outline">
          Manage Payment Account
        </Button>
      </CardContent>
    </Card>
  );
};
