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
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
                            <Scan className="w-4 h-4" />
                            <span>Computer Vision Engine v2.0</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                            List in Seconds.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                                Priced with Intelligence.
                            </span>
                        </h2>

                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Our proprietary AI analyzes your card's condition, rarity, and market velocity instantly.
                            Get real-time pricing data from across the web, ensuring you never sell for less than true value.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Instant Recognition</h4>
                                    <p className="text-sm text-zinc-500">Identifies over 15,000+ cards automatically.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-400">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Dynamic Pricing</h4>
                                    <p className="text-sm text-zinc-500">Real-time comps from eBay, TCGPlayer, and more.</p>
                                </div>
                            </div>
                        </div>

                        <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full px-8">
                            <Link to="/sell">Try AI Listing Demo</Link>
                        </Button>
                    </div>

                    {/* Visual Content */}
                    <div className="lg:w-1/2 relative">
                        <div className="relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10 bg-zinc-900/50 backdrop-blur-sm">
                            <img
                                src="/assets/home/ai_hud.png"
                                alt="AI Vision Interface"
                                className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity duration-500"
                            />

                            {/* Animated Scanning Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-scan" />
                        </div>

                        {/* Background Glow */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full opacity-50" />
                    </div>

                </div>
            </div>
        </section>
    );
};
