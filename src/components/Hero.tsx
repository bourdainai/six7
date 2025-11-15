import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-fashion.jpg";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Fashion items" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI-Native Fashion Marketplace</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          <span className="text-foreground">List in seconds.</span>
          <br />
          <span className="text-primary">Sell smarter.</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          Upload photos, let AI handle the rest. No manual descriptions, no guessing prices. 
          Just instant listings optimized to sell.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button asChild size="lg" className="text-lg px-8 shadow-large hover:shadow-medium transition-all">
            <Link to="/sell">
              <Zap className="w-5 h-5 mr-2" />
              Start Selling
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8">
            <Link to="/browse">
              <TrendingUp className="w-5 h-5 mr-2" />
              Browse Items
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="text-3xl font-bold text-primary mb-2">3 seconds</div>
            <div className="text-sm text-muted-foreground">Average time to list an item</div>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="text-3xl font-bold text-primary mb-2">2.5x faster</div>
            <div className="text-sm text-muted-foreground">Sales compared to traditional platforms</div>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="text-3xl font-bold text-primary mb-2">98% accurate</div>
            <div className="text-sm text-muted-foreground">AI-powered item categorization</div>
          </div>
        </div>
      </div>
    </section>
  );
};
