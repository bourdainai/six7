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
            containerRef.current.style.transform = `translateY(${val * 0.1}px)`;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black text-white py-24">
            {/* Background Texture */}
            <div
                className="absolute inset-0 z-0 opacity-40"
                style={{
                    backgroundImage: "url('/assets/home/hero_bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-background via-transparent to-black/90" />

            <div className="container relative z-20 mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                            The World's Most Desirable Cards.
                        </h2>
                        <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
                            Access a curated marketplace of high-end Pokémon TCG assets.
                            From vintage grails to modern chase cards, authenticated and ready for your collection.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-14 text-lg">
                                <Link to="/browse">
                                    Explore the Vault <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-14 text-lg">
                                <Link to="/sell">Start Selling</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="relative h-[600px] flex items-center justify-center perspective-1000" ref={containerRef}>
                        {/* Floating Cards */}
                        <div className="absolute top-0 right-0 w-80 transform rotate-12 hover:rotate-0 transition-all duration-700 ease-out z-10 hover:z-30 hover:scale-110">
                            <img
                                src="/assets/home/charizard.png"
                                alt="Charizard Grail"
                                className="w-full h-auto drop-shadow-[0_20px_50px_rgba(255,100,0,0.3)] rounded-xl"
                            />
                        </div>
                        <div className="absolute bottom-10 left-10 w-80 transform -rotate-12 hover:rotate-0 transition-all duration-700 ease-out z-20 hover:z-30 hover:scale-110">
                            <img
                                src="/assets/home/lugia.png"
                                alt="Lugia Grail"
                                className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,100,255,0.3)] rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
