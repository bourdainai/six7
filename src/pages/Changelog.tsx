import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

const changelogData = [
    {
        date: "November 23, 2025",
        title: "Advanced Search & Filtering",
        description: "Browse smarter with our new comprehensive filtering system. Filter by subcategory, rarity, set code, color, material, shipping options, and more. Find exactly what you're looking for with precision controls designed for serious collectors.",
        image: "/images/changelog-marketplace.png",
        tags: ["Enhancement", "UX"],
        version: "v1.3.0"
    },
    {
        date: "November 23, 2025",
        title: "Multi-Category Marketplace",
        description: "6Seven now supports Trading Cards, Sealed Products, Accessories, and Collectibles. List any collectible item with category-specific fields for quantity, brand, color, size, and material. Your marketplace just got a whole lot bigger.",
        image: "/images/changelog-marketplace.png",
        tags: ["New Feature", "Expansion"],
        version: "v1.3.0"
    },
    {
        date: "November 23, 2025",
        title: "Personalized Homepage",
        description: "Signed-in users now land directly on the Browse page with full search and filter capabilities. Skip the landing page and dive straight into discovering your next collectible.",
        image: "/images/changelog-performance.png",
        tags: ["Enhancement", "UX"],
        version: "v1.3.0"
    },
    {
        date: "November 20, 2025",
        title: "AI Listing Engine",
        description: "We've revolutionized how you list cards. Our new AI Listing Engine uses advanced computer vision to automatically identify your card, grade, and set from a single photo. It pre-fills all the details, making listing 10x faster.",
        image: "/images/changelog-ai.png",
        tags: ["New Feature", "AI"],
        version: "v1.2.0"
    },
    {
        date: "November 15, 2025",
        title: "Marketplace Expansion",
        description: "6Seven is growing. We've expanded our marketplace to support new categories including sealed product, graded slabs from all major grading companies, and raw vintage cards. The new browse experience makes finding your holy grails easier than ever.",
        image: "/images/changelog-marketplace.png",
        tags: ["Expansion", "Marketplace"],
        version: "v1.1.5"
    },
    {
        date: "November 10, 2025",
        title: "Performance Boost",
        description: "Speed matters. We've optimized our core infrastructure to deliver 50% faster page loads and smoother transitions. Whether you're browsing on mobile or desktop, 6Seven now feels snappier and more responsive.",
        image: "/images/changelog-performance.png",
        tags: ["Performance", "Infrastructure"],
        version: "v1.1.0"
    }
];

const Changelog = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <SEO
                title="Changelog - 6Seven"
                description="Stay up to date with the latest features, improvements, and releases from the 6Seven team."
            />
            <Navigation />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-16 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Changelog</h1>
                        <p className="text-xl text-muted-foreground">The latest updates and improvements to 6Seven.</p>
                    </div>

                    <div className="relative border-l border-border/50 ml-4 md:ml-0 space-y-12 md:space-y-20">
                        {changelogData.map((item, index) => (
                            <div key={index} className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] md:gap-12 group">
                                {/* Timeline dot */}
                                <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background md:hidden" />

                                {/* Date Section */}
                                <div className="mb-4 md:mb-0 md:text-right md:pt-1">
                                    <div className="sticky top-24">
                                        <span className="text-sm font-medium text-muted-foreground block mb-1">{item.date}</span>
                                        <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-1 rounded-full inline-block">{item.version}</span>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="space-y-6 pb-12 border-b border-border/50 last:border-0 last:pb-0">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {item.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs font-normal bg-secondary/50 hover:bg-secondary/70">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h2>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    {item.image && (
                                        <div className="rounded-xl overflow-hidden border border-border/50 shadow-2xl bg-card/50 mt-6">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-full h-auto object-cover transform transition-transform duration-700 hover:scale-105"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Changelog;
