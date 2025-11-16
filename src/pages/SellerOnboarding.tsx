import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";

const SellerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const initializeStripeConnect = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get account session from backend
        const { data, error: invokeError } = await supabase.functions.invoke(
          "stripe-connect-account-session"
        );

        if (invokeError) throw invokeError;
        if (!data?.clientSecret) throw new Error("No client secret returned");

        // Initialize Stripe Connect
        const stripeConnectInstance = await loadConnectAndInitialize({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
          fetchClientSecret: async () => data.clientSecret,
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: 'hsl(var(--primary))',
            },
          },
        });

        // Mount the onboarding component
        const container = document.getElementById("stripe-connect-onboarding");
        if (container) {
          const onboardingComponent = stripeConnectInstance.create("account-onboarding");
          
          onboardingComponent.setOnExit(() => {
            // User closed the onboarding, navigate back
            toast({
              title: "Onboarding incomplete",
              description: "Please complete your onboarding to receive payments",
              variant: "destructive",
            });
            navigate("/seller-dashboard");
          });

          container.innerHTML = '';
          container.appendChild(onboardingComponent);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing Stripe Connect:", err);
        setError(err instanceof Error ? err.message : "Failed to load onboarding");
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load onboarding. Please try again.",
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Seller Setup</CardTitle>
            <CardDescription>
              Set up your payment details to start receiving payments from buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading onboarding...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
              </div>
            )}
            <div id="stripe-connect-onboarding" className="min-h-[500px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOnboarding;
