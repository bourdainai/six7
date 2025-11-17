import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";

const SellerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

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
            const { data, error } = await supabase.functions.invoke(
              "stripe-connect-account-session"
            );
            if (error) throw error;
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
          description: "Failed to load onboarding. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeStripeConnect();
  }, [user, navigate, toast]);

  const openHostedOnboarding = async () => {
    try {
      setFallbackLoading(true);
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not open onboarding",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setFallbackLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Seller Setup</CardTitle>
            <CardDescription>
              Set up your payment details to start receiving payments from buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stripeConnectInstance && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading onboarding...</p>
              </div>
            )}
            {stripeConnectInstance && (
              <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                <ConnectAccountOnboarding
                  onExit={() => {
                    toast({
                      title: "Onboarding incomplete",
                      description: "Please complete your onboarding to receive payments",
                      variant: "destructive",
                    });
                    navigate("/dashboard/seller");
                  }}
                />
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    If the form doesn’t appear, open the hosted onboarding instead.
                  </p>
                  <Button size="sm" onClick={openHostedOnboarding} disabled={fallbackLoading}>
                    {fallbackLoading ? (
                      <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening…</span>
                    ) : (
                      "Open Onboarding"
                    )}
                  </Button>
                </div>
              </ConnectComponentsProvider>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOnboarding;
