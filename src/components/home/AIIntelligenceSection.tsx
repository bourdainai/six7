import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Scan, Zap, BarChart3 } from "lucide-react";

export const AIIntelligenceSection = () => {
    return (
        <section className="relative py-32 bg-zinc-950 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Text Content */}
                    <div className="lg:w-1/2 space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950 border border-cyan-500/50 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                            <Scan className="w-3 h-3" />
                            <span>Computer Vision Engine v2.0</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                            List in Seconds.<br />
                            <span className="text-cyan-400">
                                Priced with Intelligence.
                            </span>
                        </h2>

                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Our proprietary AI analyzes your card's condition, rarity, and market velocity instantly.
                            Get real-time pricing data from across the web, ensuring you never sell for less than true value.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                            <div className="flex items-start gap-4 group hover:-translate-y-1 transition-all duration-300">
                                <div className="p-3 bg-zinc-900 border border-zinc-800 text-cyan-400 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Instant Recognition</h4>
                                    <p className="text-sm text-zinc-500">Identifies over 15,000+ cards automatically.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group hover:-translate-y-1 transition-all duration-300">
                                <div className="p-3 bg-zinc-900 border border-zinc-800 text-purple-400 group-hover:border-purple-500/50 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Dynamic Pricing</h4>
                                    <p className="text-sm text-zinc-500">Real-time comps from eBay, TCGPlayer, and more.</p>
                                </div>
                            </div>
                        </div>

                        <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 border-0 hover:scale-105 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-200">
                            <Link to="/sell">Try AI Listing Demo</Link>
                        </Button>
                    </div>

                    {/* Visual Content */}
                    <div className="lg:w-1/2 relative">
                        <div className="relative z-10 border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm group">
                            <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-20 pointer-events-none" />
                            <img
                                src="/assets/home/ai_hud.png"
                                alt="AI Vision Interface"
                                className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity duration-500 mix-blend-screen"
                            />

                            {/* Animated Scanning Line */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-scan" />

                            {/* Corner Accents with Glow */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
