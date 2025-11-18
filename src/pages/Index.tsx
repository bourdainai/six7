import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { PersonalizedFeed } from "@/components/PersonalizedFeed";
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
          title="6Seven - Personalized Marketplace Feed"
          description="Discover personalized listings tailored to your preferences. Browse fashion, electronics, collectibles, and more on 6Seven's AI-powered marketplace."
          keywords="personalized shopping, AI recommendations, marketplace feed, buy and sell, fashion, electronics, collectibles"
        />
        <Navigation />
        <div className="pt-[72px]">
          <PersonalizedFeed />
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
        title="6Seven - AI-Native Marketplace | Buy & Sell with AI"
        description="List items in seconds with AI. Smart pricing, instant matching, and personalized discovery. The next generation of C2C marketplace for fashion, electronics, collectibles, and more."
        keywords="online marketplace, buy and sell, AI marketplace, resale platform, secondhand goods, fashion marketplace, electronics marketplace, collectibles, C2C marketplace, smart pricing, AI-powered selling, instant matching, personalized shopping, resale AI, 6Seven"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "6Seven",
          "url": "https://6seven.ai",
          "description": "AI-native marketplace for buying and selling items",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://6seven.ai/browse?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      
      {/* CTA Section */}
      <section className="py-32 px-6 bg-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-light mb-6 text-background leading-tight tracking-tight">
            Ready to start?
          </h2>
          <p className="text-lg text-background/80 mb-10 font-normal tracking-tight">
            Join the marketplace where selling is effortless and buying is intelligent.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base px-8 h-12 font-normal">
            <Link to="/sell">Get Started</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
