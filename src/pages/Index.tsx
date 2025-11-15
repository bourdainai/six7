import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
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
          <p>© 2025 FCVD — Fashion resale, reimagined.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
