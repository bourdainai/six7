import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Repeat, Package } from "lucide-react";

export const MarketplaceSection = () => {
    return (
        <section className="py-32 bg-white text-black">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                        The Liquid Marketplace.
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Built for the modern collector. Trade up, bundle down, and move your collection with tools designed for liquidity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Trade Offers Card */}
                    <div className="group relative overflow-hidden rounded-3xl bg-gray-50 border border-gray-200 p-12 transition-all hover:shadow-2xl hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Repeat className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center">
                                <Repeat className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-bold">Smart Trades</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Propose multi-card trades with cash adjustments. Our AI evaluates fairness instantly, so you can negotiate with confidence.
                            </p>
                            <Button asChild variant="link" className="text-black p-0 text-lg font-semibold group-hover:translate-x-2 transition-transform">
                                <Link to="/browse">Explore Trades <ArrowRight className="ml-2 w-5 h-5" /></Link>
                            </Button>
                        </div>
                    </div>

                    {/* Bundles Card */}
                    <div className="group relative overflow-hidden rounded-3xl bg-black text-white p-12 transition-all hover:shadow-2xl hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Package className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                                <Package className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-bold">Dynamic Bundles</h3>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Clear inventory faster by creating custom bundles. AI suggests optimal pairings to maximize sell-through rate.
                            </p>
                            <Button asChild variant="link" className="text-white p-0 text-lg font-semibold group-hover:translate-x-2 transition-transform">
                                <Link to="/bundles">View Bundles <ArrowRight className="ml-2 w-5 h-5" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
