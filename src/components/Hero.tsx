import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Search, TrendingUp, ShieldCheck } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black pt-20" data-homepage-version="pokemon-hero-v2">
      {/* Premium Background Effect - Clean & Deep */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-zinc-950" />
        {/* Subtle radial gradient for depth, not "party" */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950" />
        {/* Very subtle grid, barely visible for texture */}
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] bg-center opacity-[0.03] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-xs font-medium text-zinc-400 mb-8 animate-fade-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Marketplace & AI Analysis
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 animate-fade-up leading-[1.1]">
          Trade. Sell. <br className="hidden sm:block" />
          <span className="text-zinc-400">Analyze with AI.</span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-normal leading-relaxed animate-fade-up" style={{ animationDelay: '0.1s' }}>
          The modern marketplace for Pokémon cards. Instant AI pricing,
          liquid trading, and verified authenticity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 h-14 rounded-full font-medium bg-white text-black hover:bg-zinc-200 transition-all duration-200 border-0">
            <Link to="/sell">
              Start Selling
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-14 rounded-full font-medium bg-transparent text-white border-zinc-800 hover:bg-zinc-900 hover:text-white transition-all duration-200">
            <Link to="/browse">
              Browse Marketplace
            </Link>
          </Button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 text-zinc-500">
            <Search className="w-4 h-4" />
            <span className="text-sm">AI Visual Search</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Real-time Comps</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm">Verified Sellers</span>
          </div>
        </div>
      </div>
    </section>
  );
};