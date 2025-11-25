import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

const changelogData = [
    {
        date: "November 25, 2025",
        title: "AI Cloud Platform Integration",
        description: "Introducing seamless AI capabilities powered by our new AI Cloud Platform (ACP). Access to advanced models including GPT-5, Gemini 2.5 Pro, and Gemini Flash for instant price suggestions, smart auto-listing, and trade valuation. No API keys required - all AI features are plug-and-play with usage-based pricing.",
        tags: ["New Feature", "AI", "Platform"],
        version: "v1.5.0"
    },
    {
        date: "November 25, 2025",
        title: "Model Context Protocol (MCP) Support",
        description: "6Seven now supports MCP integrations for enhanced workflow automation. Connect your n8n workflows, Notion databases, Linear projects, and Jira boards directly to streamline your selling operations. Automate listing creation, inventory sync, and order fulfillment with external tools.",
        tags: ["New Feature", "Integration", "Automation"],
        version: "v1.5.0"
    },
    {
        date: "November 24, 2025",
        title: "Multi-Region Marketplace",
        description: "We've expanded globally with multi-region support. Choose between UK and International marketplaces with localized currency display, region-specific shipping calculations, and geo-optimized search results. Sellers can now reach buyers worldwide while maintaining local market preferences.",
        tags: ["New Feature", "Global", "Infrastructure"],
        version: "v1.4.5"
    },
    {
        date: "November 24, 2025",
        title: "Enhanced Security & Rate Limiting",
        description: "Upgraded platform security with comprehensive rate limiting, API key management, and usage monitoring. New anti-fraud detection systems protect both buyers and sellers. All database functions now use secure search paths to prevent SQL injection attacks.",
        tags: ["Security", "Infrastructure"],
        version: "v1.4.5"
    },
    {
        date: "November 24, 2025",
        title: "Seller Copilot Optimization",
        description: "Seller Dashboard performance improvements with on-demand AI insights instead of auto-refresh. Manual refresh button for copilot suggestions and stale inventory alerts now use intelligent date-based logic. Reduced AI credit consumption by up to 70% while maintaining full functionality.",
        tags: ["Enhancement", "Performance", "Seller Tools"],
        version: "v1.4.2"
    },
    {
        date: "November 23, 2025",
        title: "Multi-Card Bundle Listings",
        description: "Sellers can now list up to 30 cards in a single bundle listing. Smart auto-formatting groups cards by set or rarity, calculates bundle value, shows savings percentage, and automatically pulls card images from our database. Perfect for selling collections, playsets, or themed bundles.",
        tags: ["New Feature", "Trading Cards"],
        version: "v1.4.0"
    },
    {
        date: "November 23, 2025",
        title: "Advanced Search & Filtering",
        description: "Browse smarter with our new comprehensive filtering system. Filter by subcategory, rarity, set code, color, material, shipping options, and more. Find exactly what you're looking for with precision controls designed for serious collectors.",
        tags: ["Enhancement", "UX"],
        version: "v1.3.0"
    },
    {
        date: "November 23, 2025",
        title: "Multi-Category Marketplace",
        description: "6Seven now supports Trading Cards, Sealed Products, Accessories, and Collectibles. List any collectible item with category-specific fields for quantity, brand, color, size, and material. Your marketplace just got a whole lot bigger.",
        tags: ["New Feature", "Expansion"],
        version: "v1.3.0"
    },
    {
        date: "November 20, 2025",
        title: "AI Listing Engine",
        description: "We've revolutionized how you list cards. Our new AI Listing Engine uses advanced computer vision to automatically identify your card, grade, and set from a single photo. It pre-fills all the details, making listing 10x faster.",
        tags: ["New Feature", "AI"],
        version: "v1.2.0"
    },
    {
        date: "November 15, 2025",
        title: "Marketplace Expansion",
        description: "6Seven is growing. We've expanded our marketplace to support new categories including sealed product, graded slabs from all major grading companies, and raw vintage cards. The new browse experience makes finding your holy grails easier than ever.",
        tags: ["Expansion", "Marketplace"],
        version: "v1.1.5"
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

            <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-12 pb-8 border-b border-border">
                        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Changelog</h1>
                        <p className="text-base text-muted-foreground">The latest updates and improvements to 6Seven.</p>
                    </div>

                    {/* Changelog Entries */}
                    <div className="space-y-12">
                        {changelogData.map((item, index) => (
                            <article key={index} className="group">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
                                    {/* Date & Version */}
                                    <div className="flex-shrink-0 sm:w-44">
                                        <time className="text-sm font-medium text-muted-foreground block">{item.date}</time>
                                        <span className="inline-flex mt-2 text-xs font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-md">{item.version}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {item.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs font-medium">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-xl md:text-2xl font-semibold mb-2 tracking-tight">
                                            {item.title}
                                        </h2>

                                        {/* Description */}
                                        <p className="text-base text-muted-foreground leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider (except last item) */}
                                {index < changelogData.length - 1 && (
                                    <hr className="mt-12 border-border" />
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Changelog;
