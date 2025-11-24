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
  const { user } = useAuth();
  const navigate = useNavigate();
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
      } else {
        // Redirect to browse if user has preferences
        navigate('/browse');
      }
    };

    checkPreferences();
  }, [user, navigate]);

  // Show onboarding dialog if needed
  if (user && showOnboarding && hasPreferences === false) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Welcome to 6Seven"
          description="Let's personalize your experience"
        />
        <Navigation />
        <BuyerOnboarding onComplete={() => {
          setShowOnboarding(false);
          setHasPreferences(true);
          navigate('/browse');
        }} />
      </div>
    );
  }

  // If user is logged in with preferences, redirect to browse
  if (user && hasPreferences === true) {
    navigate('/browse');
    return null;
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
