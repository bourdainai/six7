import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";
import { AIIntelligenceSection } from "@/components/home/AIIntelligenceSection";
import { MarketplaceSection } from "@/components/home/MarketplaceSection";
import { TrustSection } from "@/components/home/TrustSection";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { BuyerOnboarding } from "@/components/BuyerOnboarding";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  const [checkingPreferences, setCheckingPreferences] = useState(false);

  useEffect(() => {
    const checkPreferences = async () => {
      // Don't check preferences while auth is still loading
      if (authLoading) {
        console.log("⏳ [Index] Waiting for auth to complete...");
        return;
      }

      if (!user) {
        console.log("👤 [Index] No user, showing marketing page");
        setHasPreferences(null);
        return;
      }

      console.log("🔍 [Index] Checking user preferences for user:", user.id);
      setCheckingPreferences(true);

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no row exists

        if (error) {
          console.error("❌ [Index] Error checking preferences:", error);
          // On error, assume no preferences and show onboarding
          setHasPreferences(false);
          setShowOnboarding(true);
          return;
        }

        const hasPref = !!data;
        console.log("✅ [Index] Has preferences:", hasPref);
        setHasPreferences(hasPref);

        // Show onboarding if user is logged in but has no preferences
        if (!hasPref) {
          console.log("📝 [Index] No preferences, showing onboarding");
          setShowOnboarding(true);
        } else {
          // Add a small delay before redirect to prevent race conditions
          console.log("🔄 [Index] Has preferences, redirecting to browse...");
          setTimeout(() => {
            navigate('/browse', { replace: true });
          }, 100);
        }
      } catch (err) {
        console.error("💥 [Index] Unexpected error checking preferences:", err);
        setHasPreferences(false);
        setShowOnboarding(true);
      } finally {
        setCheckingPreferences(false);
      }
    };

    checkPreferences();
  }, [user, authLoading, navigate]);

  // Show loading state while checking auth or preferences
  if (authLoading || checkingPreferences) {
    console.log("⏳ [Index] Loading state - auth:", authLoading, "prefs:", checkingPreferences);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding dialog if needed
  if (user && showOnboarding && hasPreferences === false) {
    console.log("📝 [Index] Rendering onboarding");
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Welcome to 6Seven"
          description="Let's personalize your experience"
        />
        <Navigation />
        <BuyerOnboarding onComplete={() => {
          console.log("✅ [Index] Onboarding complete");
          setShowOnboarding(false);
          setHasPreferences(true);
          navigate('/browse', { replace: true });
        }} />
      </div>
    );
  }

  // If user is logged in with preferences, they should already be redirected
  // This is just a safety check to prevent flash of content
  if (user && hasPreferences === true) {
    console.log("🔄 [Index] User with preferences detected, redirecting...");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show marketing pages
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="6Seven - AI-Native Pokémon Card Marketplace"
        description="List Pokémon cards in seconds with AI. Get instant pricing suggestions from comps, trade offers, and bundles. Built for modern trading behaviour, not generic classifieds."
        keywords="Pokémon cards, pokemon marketplace, pokemon tcg, graded cards, card trading, card marketplace, AI pricing, trade offers, bundles"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "6Seven",
          "url": "https://6seven.ai",
          "description": "AI-native marketplace for buying, selling, and trading Pokémon cards",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://6seven.ai/browse?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Navigation />
      <Hero />

      {/* New Homepage Sections */}
      <ShowcaseSection />
      <AIIntelligenceSection />
      <MarketplaceSection />
      <TrustSection />

      {/* CTA Section */}
      <section className="py-16 md:py-32 px-4 sm:px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light mb-4 md:mb-6 leading-tight tracking-tight">
            Ready to start?
          </h2>
          <p className="text-base md:text-lg text-white/80 mb-8 md:mb-10 font-normal tracking-tight">
            Join the marketplace where selling is effortless and buying is intelligent.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base px-6 md:px-8 h-11 md:h-12 font-normal bg-white text-black hover:bg-gray-200">
            <Link to="/sell">Get Started</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
