import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
} from "@stripe/react-connect-js";
import PayoutHistory from "@/components/seller/PayoutHistory";
import PayoutSchedule from "@/components/seller/PayoutSchedule";
import VerificationRequirements from "@/components/seller/VerificationRequirements";
import { EmailVerificationStatus } from "@/components/EmailVerificationStatus";

const SellerAccountManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
    const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const initializeStripeConnect = async () => {
      try {
        const instance = await loadConnectAndInitialize({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
          fetchClientSecret: async () => {
            const { data } = await supabase.functions.invoke(
              "stripe-connect-account-session"
            );
            return data.clientSecret;
          },
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: 'hsl(var(--primary))',
            },
          },
        });

        setStripeConnectInstance(instance);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Error initializing Stripe Connect:", err);
        }
        toast({
          title: "Error",
          description: "Failed to load account management. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeStripeConnect();
  }, [user, navigate, toast]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="payouts">Payout History</TabsTrigger>
            <TabsTrigger value="schedule">Payout Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6 space-y-6">
            <EmailVerificationStatus />
            <Card>
              <CardHeader>
                <CardTitle>Manage Your Payment Account</CardTitle>
                <CardDescription>
                  Update your payment details and manage your seller account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!stripeConnectInstance && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading account management...</p>
                  </div>
                )}
                {stripeConnectInstance && (
                  <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                    <ConnectAccountManagement />
                  </ConnectComponentsProvider>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="mt-6">
            <VerificationRequirements />
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <PayoutHistory />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <PayoutSchedule />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerAccountManagement;
