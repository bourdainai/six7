import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";
import { AIIntelligenceSection } from "@/components/home/AIIntelligenceSection";
import { MarketplaceSection } from "@/components/home/MarketplaceSection";
import { TrustSection } from "@/components/home/TrustSection";
import { Feed } from "@/components/Feed";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BuyerOnboarding } from "@/components/BuyerOnboarding";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

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
        <SEO
          title="6Seven - Personalized Pokémon Card Feed"
          description="Discover graded and raw Pokémon cards tailored to your tastes. AI ranks listings by set, rarity, condition, and price so you always see the best trades first."
          keywords="Pokémon cards, pokemon tcg, graded pokemon cards, raw pokemon cards, card marketplace, AI recommendations, trading cards"
        />
        <Navigation />
        <div className="pt-[72px]">
          <Feed />
        </div>

        {showOnboarding && hasPreferences === false && (
          <BuyerOnboarding onComplete={() => {
            setShowOnboarding(false);
            setHasPreferences(true);
          }} />
        )}

        <Footer />
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
      <section className="py-32 px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight tracking-tight">
            Ready to start?
          </h2>
          <p className="text-lg text-white/80 mb-10 font-normal tracking-tight">
            Join the marketplace where selling is effortless and buying is intelligent.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base px-8 h-12 font-normal bg-white text-black hover:bg-gray-200">
            <Link to="/sell">Get Started</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
