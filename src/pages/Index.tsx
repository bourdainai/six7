import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { PersonalizedFeed } from "@/components/PersonalizedFeed";
import { BuyerOnboarding } from "@/components/BuyerOnboarding";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPreferences = async () => {
      if (!user) {
        setHasPreferences(null);
        return;
      }

      const { data } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setHasPreferences(!!data);
      
      // Show onboarding if user is logged in but has no preferences
      if (!data) {
        setShowOnboarding(true);
      }
    };

    checkPreferences();
  }, [user]);

  // If user is logged in, show personalized feed
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20">
          <PersonalizedFeed />
        </div>
        
        {showOnboarding && hasPreferences === false && (
          <BuyerOnboarding onComplete={() => {
            setShowOnboarding(false);
            setHasPreferences(true);
          }} />
        )}

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border/50">
          <div className="max-w-7xl mx-auto text-center text-xs text-muted-foreground font-light tracking-wide">
            <p>© 2025 FCVD — AI-native fashion marketplace</p>
          </div>
        </footer>
      </div>
    );
  }

  // If not logged in, show marketing pages
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      
      {/* CTA Section */}
      <section className="py-32 px-6 bg-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-light mb-6 text-background leading-tight">
            Ready to start?
          </h2>
          <p className="text-lg text-background/80 mb-10 font-light">
            Join the marketplace where selling is effortless and buying is intelligent.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base px-8 h-12 font-normal">
            <Link to="/sell">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-xs text-muted-foreground font-light tracking-wide">
          <p>© 2025 FCVD — AI-native fashion marketplace</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
