import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import "@stripe/connect-js/styles.css";

const SellerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const initializeStripeConnect = async () => {
      try {
        if (mountedRef.current) {
          console.log("Onboarding already initialized");
          return;
        }
        setLoading(true);
        setError(null);

        // Get account session from backend
        const { data, error: invokeError } = await supabase.functions.invoke(
          "stripe-connect-account-session"
        );

        if (invokeError) throw invokeError;
        if (!data?.clientSecret) throw new Error("No client secret returned");

        console.log("Initializing Stripe Connect with account:", data.accountId);

        // Initialize Stripe Connect
        const stripeConnectInstance = await loadConnectAndInitialize({
          publishableKey: (data.publishableKey as string) || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
          fetchClientSecret: async () => data.clientSecret,
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#635BFF',
            },
          },
        });

        console.log("Stripe Connect instance created");

        // Mount the onboarding component using the lower-level API
        const container = containerRef.current;
        if (container) {
          // Clear any existing content
          container.innerHTML = '';
          
          // Create the account onboarding component with correct API
          const accountOnboarding = stripeConnectInstance.create("account-onboarding");
          
          console.log("Account onboarding component created");
          
          // Set up exit handler using event listener
          accountOnboarding.addEventListener("exit", () => {
            console.log("User exited onboarding");
            toast({
              title: "Onboarding incomplete",
              description: "Please complete your onboarding to receive payments",
              variant: "destructive",
            });
            navigate("/dashboard/seller");
          });

          // Mount the component
          (accountOnboarding as any).mount(container);
          console.log("Account onboarding component mounted");
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
                <p className="text-sm text-muted-foreground">Loading onboarding form...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
              </div>
            )}
            <div 
              ref={containerRef}
              className="min-h-[600px] w-full"
              style={{ minHeight: '600px' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOnboarding;
