import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-fashion.jpg";
import { ArrowRight } from "lucide-react";
export const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 pt-20" data-homepage-version="pokemon-hero-v1">
      {/* Premium Background Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 opacity-80" />
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-light mb-8 tracking-tight leading-[1.1]">
          <span className="text-white font-extralight">The World's Premier</span>
          <br />
          <span className="text-white font-normal">Pokémon Marketplace.</span>
        </h1>

        <p className="text-base md:text-lg text-zinc-400 mb-12 max-w-2xl mx-auto font-normal leading-relaxed tracking-tight">
          Authenticated. Sell in answer engines. 
The only AI-native platform built for the modern collector.
          <br className="hidden md:block" />
          The only AI-native platform built for the modern collector.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button asChild size="lg" className="text-base px-8 h-12 font-normal bg-white text-black hover:bg-zinc-200 border-0">
            <Link to="/sell">
              Start Selling
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8 h-12 font-normal bg-white text-black hover:bg-zinc-200 border-0">
            <Link to="/browse">
              Browse Items
            </Link>
          </Button>
        </div>

        {/* Stats - ultra-minimal design */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-12 border-t border-zinc-900">
          <div>
            <div className="text-3xl font-light text-white mb-1 tracking-tight">10s</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-normal">Avg. list time</div>
          </div>
          <div>
            <div className="text-3xl font-light text-white mb-1 tracking-tight">40%</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-normal">      CHEAPER SALES</div>
          </div>
          <div>
            <div className="text-3xl font-light text-white mb-1 tracking-tight">99.8%</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-normal">AI accuracy</div>
          </div>
        </div>
      </div>
    </section>;
};