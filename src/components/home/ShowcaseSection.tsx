import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const ShowcaseSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrolled = window.scrollY;
            const val = scrolled * 0.5;
            // Subtle parallax, less aggressive
            containerRef.current.style.transform = `translateY(${val * 0.05}px)`;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <section className="relative min-h-[80vh] flex items-center bg-zinc-950 text-white py-24 overflow-hidden">
            {/* Clean Background */}
            <div className="absolute inset-0 bg-zinc-950" />

            <div className="container relative z-20 mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 order-2 lg:order-1">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1]">
                            The World's Most <br />
                            <span className="text-zinc-500">Desirable Cards.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed">
                            Access a curated marketplace of high-end Pokémon TCG assets.
                            From vintage grails to modern chase cards, authenticated and ready for your collection.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button asChild size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 transition-all duration-200 px-8 h-14 rounded-full text-base font-medium border-0">
                                <Link to="/browse">
                                    Explore the Vault <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="relative h-[400px] md:h-[600px] flex items-center justify-center order-1 lg:order-2" ref={containerRef}>
                        {/* Clean Card Presentation */}
                        <div className="relative z-10 transform transition-all duration-700 hover:scale-105">
                            {/* Placeholder for high-quality card render - using existing assets but cleaner presentation */}
                            <div className="relative w-64 md:w-80 aspect-[2.5/3.5] rounded-xl shadow-2xl rotate-[-6deg] bg-zinc-900 border border-zinc-800 overflow-hidden">
                                <img
                                    src="/assets/home/charizard.png"
                                    alt="Charizard Grail"
                                    className="w-full h-full object-cover"
                                />
                                {/* Glass reflection effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                            </div>

                            <div className="absolute top-1/2 -right-12 md:-right-24 w-64 md:w-80 aspect-[2.5/3.5] rounded-xl shadow-2xl rotate-[6deg] bg-zinc-900 border border-zinc-800 overflow-hidden -z-10 translate-y-12">
                                <img
                                    src="/assets/home/lugia.png"
                                    alt="Lugia Grail"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
