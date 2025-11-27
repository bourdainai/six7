import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./AuthProvider";
import { Loader2, ArrowRight } from "lucide-react";
import { BuyerOnboarding } from "@/components/BuyerOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signin" | "signup";
}

export const AuthModal = ({ open, onOpenChange, defaultMode = "signin" }: AuthModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMarketplaceSelection, setShowMarketplaceSelection] = useState(false);
  const [showListingOption, setShowListingOption] = useState(false);

  const { signIn, signUp } = useAuth();

  // Sync mode with defaultMode when modal opens or defaultMode changes
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setError("");
    }
  }, [open, defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, fullName);
        setShowMarketplaceSelection(true);
      } else {
        await signIn(email, password);
        onOpenChange(false);
      }
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketplaceSelection = async (marketplace: 'UK' | 'US') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          marketplace,
          country: marketplace === 'US' ? 'US' : 'GB',
          preferred_currency: marketplace === 'US' ? 'USD' : 'GBP',
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      localStorage.setItem('marketplace', marketplace);
      setShowMarketplaceSelection(false);
      setShowListingOption(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to set marketplace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    onOpenChange(false);
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
    onOpenChange(false);
  };

  const handleStartListing = () => {
    setShowListingOption(false);
    onOpenChange(false);
    navigate("/sell");
  };

  const handleDoOnboarding = () => {
    setShowListingOption(false);
    setShowOnboarding(true);
  };

  if (showOnboarding) {
    return <BuyerOnboarding onComplete={handleOnboardingComplete} onSkip={handleSkipOnboarding} />;
  }

  if (showMarketplaceSelection) {
    return (
      <Dialog open={true} onOpenChange={() => { }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Your Market</DialogTitle>
            <DialogDescription>
              Choose where you'll buy and sell. This determines your marketplace currency and listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-6">
            <Button
              onClick={() => handleMarketplaceSelection('UK')}
              disabled={loading}
              className="w-full h-20 text-lg justify-start gap-4"
              variant="outline"
            >
              <span className="text-4xl">🇬🇧</span>
              <div className="text-left">
                <div className="font-semibold">United Kingdom</div>
                <div className="text-sm text-muted-foreground">Buy and sell in £ (GBP)</div>
              </div>
            </Button>
            <Button
              onClick={() => handleMarketplaceSelection('US')}
              disabled={loading}
              className="w-full h-20 text-lg justify-start gap-4"
              variant="outline"
            >
              <span className="text-4xl">🇺🇸</span>
              <div className="text-left">
                <div className="font-semibold">United States</div>
                <div className="text-sm text-muted-foreground">Buy and sell in $ (USD)</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showListingOption) {
    return (
      <Dialog open={true} onOpenChange={() => { }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to 6Seven!</DialogTitle>
            <DialogDescription>
              Your account has been created. Please check your email to verify your account. What would you like to do first?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              onClick={handleStartListing}
              className="w-full justify-between"
              size="lg"
            >
              Start Listing Items
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleDoOnboarding}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Set Up Buyer Preferences
            </Button>
            <Button
              onClick={() => {
                setShowListingOption(false);
                onOpenChange(false);
              }}
              variant="ghost"
              className="w-full"
            >
              Browse Marketplace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "Welcome back to 6Seven"
              : "Join 6Seven and start selling in seconds"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
