import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Scan, Zap, BarChart3, ArrowRight } from "lucide-react";

export const AIIntelligenceSection = () => {
    return (
        <section className="relative py-24 md:py-32 bg-zinc-950 overflow-hidden border-t border-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">

                    {/* Text Content */}
                    <div className="lg:w-1/2 space-y-10">
                        <div className="inline-flex items-center gap-2 text-zinc-400 text-sm font-medium tracking-wide uppercase">
                            <Scan className="w-4 h-4" />
                            <span>Computer Vision Engine v2.0</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-[1.1]">
                            List in Seconds.<br />
                            <span className="text-zinc-500">
                                Priced with Intelligence.
                            </span>
                        </h2>

                        <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-lg">
                            Our proprietary AI analyzes your card's condition, rarity, and market velocity instantly.
                            Get real-time pricing data from across the web, ensuring you never sell for less than true value.
                        </p>

                        <div className="space-y-6 pt-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white mt-1">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-lg mb-1">Instant Recognition</h4>
                                    <p className="text-zinc-500 leading-relaxed">Identifies over 15,000+ cards automatically from a single photo.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white mt-1">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-lg mb-1">Dynamic Pricing</h4>
                                    <p className="text-zinc-500 leading-relaxed">Real-time comps from eBay, TCGPlayer, and more to guide your pricing.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-full border-zinc-800 text-white hover:bg-white hover:text-black transition-all duration-200">
                                <Link to="/sell">
                                    Try AI Listing Demo <ArrowRight className="ml-2 w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Visual Content - Clean UI Mockup */}
                    <div className="lg:w-1/2 w-full">
                        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-2xl">
                            {/* Header Mockup */}
                            <div className="h-12 border-b border-zinc-800 bg-zinc-900/80 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                            </div>

                            {/* Content Mockup */}
                            <div className="p-8 relative">
                                <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.05]" />
                                <img
                                    src="/assets/home/ai_hud.png"
                                    alt="AI Vision Interface"
                                    className="w-full h-auto rounded-lg shadow-lg border border-zinc-800/50 relative z-10"
                                />

                                {/* Overlay UI Elements - Clean & Technical */}
                                <div className="absolute top-12 right-12 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg p-4 z-20 shadow-xl max-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-mono text-zinc-400">ANALYSIS COMPLETE</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Card</span>
                                            <span className="text-white">Charizard</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Set</span>
                                            <span className="text-white">Base Set</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Est. Value</span>
                                            <span className="text-green-400 font-medium">$450 - $600</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
