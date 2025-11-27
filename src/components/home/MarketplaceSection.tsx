import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Repeat, Package, ArrowUpRight } from "lucide-react";

export const MarketplaceSection = () => {
    return (
        <section className="py-24 md:py-32 bg-white text-black border-t border-zinc-100">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 leading-[1.1]">
                            The Liquid Marketplace.
                        </h2>
                        <p className="text-xl text-zinc-500 leading-relaxed">
                            Built for the modern collector. Trade up, bundle down, and move your collection with tools designed for liquidity.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full h-12 px-6 border-zinc-200 hover:bg-zinc-50 hover:text-black transition-colors">
                        <Link to="/browse">
                            View All Listings <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Trade Offers Card */}
                    <div className="group relative overflow-hidden bg-zinc-50 rounded-3xl p-10 md:p-12 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-zinc-100">
                        <div className="absolute top-8 right-8 p-4 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <ArrowUpRight className="w-6 h-6 text-black" />
                        </div>

                        <div className="relative z-10 h-full flex flex-col justify-between space-y-12">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100">
                                <Repeat className="w-6 h-6 text-black" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl font-medium tracking-tight">Smart Trades</h3>
                                <p className="text-zinc-500 text-lg leading-relaxed max-w-md">
                                    Propose multi-card trades with cash adjustments. Our AI evaluates fairness instantly, so you can negotiate with confidence.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bundles Card */}
                    <div className="group relative overflow-hidden bg-black text-white rounded-3xl p-10 md:p-12 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <div className="absolute top-8 right-8 p-4 bg-zinc-800 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <ArrowUpRight className="w-6 h-6 text-white" />
                        </div>

                        <div className="relative z-10 h-full flex flex-col justify-between space-y-12">
                            <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                                <Package className="w-6 h-6 text-white" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl font-medium tracking-tight">Dynamic Bundles</h3>
                                <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                                    Clear inventory faster by creating custom bundles. AI suggests optimal pairings to maximize sell-through rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
