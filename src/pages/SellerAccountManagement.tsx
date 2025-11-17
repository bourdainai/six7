import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
} from "@stripe/react-connect-js";

const SellerAccountManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);

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
        console.error("Error initializing Stripe Connect:", err);
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

        <Card>
          <CardHeader>
            <CardTitle>Manage Your Payment Account</CardTitle>
            <CardDescription>
              Update your payment details, view payouts, and manage your seller account
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
      </div>
    </div>
  );
};

export default SellerAccountManagement;
