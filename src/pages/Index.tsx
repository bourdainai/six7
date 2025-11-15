import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      
      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-hero">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles className="w-12 h-12 text-white mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to revolutionize resale?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the AI-native marketplace where selling is effortless and buying is personalized.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 shadow-large">
            <Link to="/sell">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Resale AI. Built AI-first, designed for the future of fashion resale.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
