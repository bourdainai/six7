import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-fashion.jpg";
import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background image with sophisticated overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Fashion items" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center">
        <h1 className="text-6xl md:text-8xl font-light mb-8 tracking-tight leading-none">
          <span className="text-foreground font-extralight">Resale,</span>
          <br />
          <span className="text-foreground font-medium">Reimagined.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          List from photos. AI does the rest. No tedious forms, no pricing guesswork.
          <br className="hidden md:block" />
          Fashion resale that actually works.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button asChild size="lg" className="text-base px-8 h-12 font-normal">
            <Link to="/sell">
              Start Selling
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8 h-12 font-normal">
            <Link to="/browse">
              Browse Items
            </Link>
          </Button>
        </div>

        {/* Stats - cleaner design */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-12 border-t border-border/50">
          <div>
            <div className="text-3xl font-light text-foreground mb-1">3s</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg. list time</div>
          </div>
          <div>
            <div className="text-3xl font-light text-foreground mb-1">2.5x</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Faster sales</div>
          </div>
          <div>
            <div className="text-3xl font-light text-foreground mb-1">98%</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">AI accuracy</div>
          </div>
        </div>
      </div>
    </section>
  );
};
