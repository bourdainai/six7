import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useWallet } from "@/hooks/useWallet";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutFormProps {
  orderId: string;
  listingTitle: string;
  canProceed: boolean;
}

const CheckoutForm = ({ orderId, listingTitle, canProceed }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!canProceed) {
      toast({
        title: "Cannot proceed",
        description: "Please resolve validation errors before completing payment",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?success=true&order=${orderId}`,
      },
    });

    if (error) {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-soft-neutral border border-divider-gray p-6 mb-6">
        <h3 className="text-sm font-normal text-foreground mb-2 tracking-tight">Order Summary</h3>
        <p className="text-sm text-muted-foreground font-normal">{listingTitle}</p>
      </div>

      <PaymentElement />

              <Button
                type="submit"
                disabled={!stripe || isProcessing || !canProceed}
                className="w-full h-12"
                size="lg"
              >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Complete Purchase"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By completing this purchase, you agree to our terms and conditions
      </p>
    </form>
  );
};

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isVerified: emailVerified } = useEmailVerification();
  const { wallet } = useWallet(); // Add wallet hook
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'wallet'>('stripe');

  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    country: "GB",
  });

  // Check for offer in URL params
  const searchParams = new URLSearchParams(window.location.search);
  const offerId = searchParams.get('offer');

  const { data: listing, isLoading: isLoadingListing } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          seller:profiles!seller_id(
            id,
            stripe_connect_account_id,
            stripe_onboarding_complete,
            can_receive_payments
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch offer if present
  const { data: offer } = useQuery({
    queryKey: ["offer", offerId],
    queryFn: async () => {
      if (!offerId) return null;
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .eq("status", "accepted")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!offerId,
  });

  // Calculate shipping cost - UK only
  const calculateShippingCost = () => {
    if (!listing) return 0;
    if (listing.free_shipping) return 0;
    return Number(listing.shipping_cost_uk || 0);
  };

  const shippingCost = calculateShippingCost();
  // Use offer amount if available, otherwise use listing price
  const itemPrice = offer ? Number(offer.amount) : Number(listing?.seller_price || 0);
  
  // Fetch fee calculation
  const { data: feeData } = useQuery({
    queryKey: ["fees", user?.id, listing?.seller_id, itemPrice],
    queryFn: async () => {
      if (!user?.id || !listing?.seller_id) return null;
      const { data, error } = await supabase.functions.invoke("calculate-fees", {
        body: {
          buyerId: user.id,
          sellerId: listing.seller_id,
          itemPrice: itemPrice,
          shippingCost: shippingCost,
          wholesaleShippingCost: 0,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!listing?.seller_id,
  });

  const buyerProtectionFee = feeData?.buyerProtectionFee || 0;
  const totalPrice = itemPrice + shippingCost + buyerProtectionFee;

  const walletPurchaseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wallet-purchase", {
        body: {
          listingId: id,
          shippingAddress,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase successful!",
        description: "Your order has been placed using your wallet balance.",
      });
      navigate(`/orders?success=true&order=${data.orderId}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Wallet purchase failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          listingId: id,
          shippingAddress,
        },
      });

      if (error) throw error;
      return data;
    },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Checkout failed",
          description: message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional validation before submitting
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete your purchase",
        variant: "destructive",
      });
      return;
    }

    // Check email verification
    if (!emailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email address before making purchases. Check your inbox for the verification link.",
        variant: "destructive",
      });
      return;
    }

    if (!canProceed) {
      toast({
        title: "Cannot proceed",
        description: "Please resolve the validation errors above",
        variant: "destructive",
      });
      return;
    }

    // Validate shipping address
    if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postal_code) {
      toast({
        title: "Incomplete shipping address",
        description: "Please fill in all required shipping address fields",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'wallet') {
      if (!wallet || wallet.balance < totalPrice) {
        toast({
          title: "Insufficient balance",
          description: "Please top up your wallet or choose another payment method",
          variant: "destructive",
        });
        return;
      }
      walletPurchaseMutation.mutate();
    } else {
      createCheckoutMutation.mutate();
    }
  };

  if (isLoadingListing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-[72px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-soft-neutral w-1/2"></div>
          <div className="h-64 bg-soft-neutral"></div>
        </div>
      </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl font-light text-foreground mb-4 tracking-tight">Listing not found</h1>
          <Button variant="outline" onClick={() => navigate("/browse")}>
            Browse Items
          </Button>
        </div>
      </div>
    );
  }

  // Validation checks
  const validationErrors: string[] = [];
  
  if (user?.id === listing.seller_id) {
    validationErrors.push("You cannot purchase your own listing");
  }
  
  if (listing.status !== "active") {
    validationErrors.push("This listing is no longer available for purchase");
  }
  
  if (listing.seller && !listing.seller.stripe_connect_account_id) {
    validationErrors.push("The seller has not set up payment processing yet");
  }
  
  if (listing.seller && !listing.seller.stripe_onboarding_complete) {
    validationErrors.push("The seller's payment account is not fully set up");
  }
  
  if (listing.seller && !listing.seller.can_receive_payments) {
    validationErrors.push("The seller cannot receive payments at this time");
  }

  const canProceed = validationErrors.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-[72px]">
        <button
          onClick={() => navigate(`/listing/${id}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Listing
        </button>

        <h1 className="text-3xl font-light text-foreground mb-8 tracking-tight">Checkout</h1>

        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20">
            <h3 className="text-sm font-normal text-destructive mb-2 tracking-tight">Cannot Complete Purchase</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-destructive font-normal">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(`/listing/${id}`)}
            >
              Back to Listing
            </Button>
          </div>
        )}

        {!createCheckoutMutation.data ? (
            <form onSubmit={handleCreateCheckout} className="space-y-6">
              {!canProceed && (
                <div className="p-4 bg-soft-neutral border border-divider-gray">
                  <p className="text-sm text-muted-foreground font-normal">
                    Please resolve the issues above before proceeding with checkout.
                  </p>
                </div>
              )}
            <div className="bg-soft-neutral border border-divider-gray p-6 mb-8">
              <h2 className="text-lg font-light text-foreground mb-4 tracking-tight">{listing.title}</h2>
              {offer && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20">
                  <p className="text-sm font-normal text-green-600 dark:text-green-400">
                    ✅ Accepted Offer Price
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-normal">
                    Original price: £{Number(listing?.seller_price || 0).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {offer ? 'Agreed Price' : 'Item Price'}
                  </span>
                  <span className="text-foreground">£{itemPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer Protection</span>
                  <span className="text-foreground">
                    {buyerProtectionFee > 0 ? `£${buyerProtectionFee.toFixed(2)}` : 'FREE'}
                  </span>
                </div>
                {feeData?.buyerTier === 'pro' && buyerProtectionFee === 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✓ Pro Member Benefit
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">
                    {listing.free_shipping ? 'FREE' : `£${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-divider-gray pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-normal text-foreground tracking-tight">Total</span>
                    <span className="text-2xl font-light text-foreground tracking-tight">
                      £{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-normal text-foreground tracking-tight">Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'bg-primary/5 border-primary ring-1 ring-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <div className="font-medium">Card Payment</div>
                  <div className="text-sm text-muted-foreground">Pay securely via Stripe</div>
                </div>
                
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'wallet'
                      ? 'bg-primary/5 border-primary ring-1 ring-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="font-medium">Wallet Balance</div>
                  <div className="text-sm text-muted-foreground">
                    Balance: £{wallet?.balance?.toFixed(2) || '0.00'}
                  </div>
                  {(wallet?.balance || 0) < totalPrice && (
                    <div className="text-xs text-destructive mt-1">Insufficient funds</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-normal text-foreground tracking-tight">Shipping Address</h3>
              
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  required
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="line1">Address Line 1</Label>
                <Input
                  id="line1"
                  required
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                <Input
                  id="line2"
                  value={shippingAddress.line2}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    required
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Postcode</Label>
                  <Input
                    id="postal_code"
                    required
                    value={shippingAddress.postal_code}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createCheckoutMutation.isPending}
              className="w-full h-12"
              size="lg"
            >
              {createCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
          </form>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: createCheckoutMutation.data.clientSecret,
              appearance: {
                theme: "flat",
                variables: {
                  colorPrimary: "hsl(var(--primary))",
                  colorBackground: "hsl(var(--background))",
                  colorText: "hsl(var(--foreground))",
                  borderRadius: "2px",
                },
              },
            }}
          >
            <CheckoutForm
              orderId={createCheckoutMutation.data.orderId}
              listingTitle={listing.title}
              canProceed={canProceed}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default Checkout;