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
        title: "Smart Trade System with AI Valuation",
        description: "Revolutionary peer-to-peer trading platform that goes beyond traditional sales. Propose trades with any combination of cards and cash, powered by real-time AI fairness scoring. Our intelligent valuation engine analyzes market data to ensure equitable trades, while the fairness meter shows both parties exactly where the deal stands.",
        tags: ["New Feature", "Trading", "AI"],
        version: "v1.4.3"
    },
    {
        date: "November 24, 2025",
        title: "Trade Counter-Offers & Negotiations",
        description: "Full negotiation workflow for trades with unlimited counter-offer rounds. Both parties can adjust card selections, cash amounts, and trade terms until reaching agreement. Real-time notifications keep all parties informed throughout the negotiation process.",
        tags: ["New Feature", "Trading"],
        version: "v1.4.3"
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
        title: "Seller Copilot with AI Insights",
        description: "Your personal AI assistant for optimizing sales. Get instant recommendations on pricing adjustments, stale inventory alerts, photo quality improvements, and tag optimization. On-demand insights help you maximize visibility and sell faster without overwhelming you with notifications.",
        tags: ["New Feature", "AI", "Seller Tools"],
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
        title: "Variant-Based Selling",
        description: "List multiple conditions and quantities of the same card in one listing. Buyers can choose from Mint, Near Mint, Played conditions with individual pricing and dedicated photos for each variant. Streamlines inventory management for sellers with multiple copies.",
        tags: ["New Feature", "Seller Tools"],
        version: "v1.3.8"
    },
    {
        date: "November 23, 2025",
        title: "Smart Offer System",
        description: "Enable offers on your listings and let buyers negotiate. Sellers can accept, decline, or counter any offer with custom pricing and messages. Full offer history tracking shows negotiation flow, with automatic expiration to keep your inbox clean.",
        tags: ["New Feature", "Negotiation"],
        version: "v1.3.5"
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
        title: "Vibe-Based Search (AI-Powered)",
        description: "Describe what you're looking for in natural language and let AI find it. Search by mood, theme, or aesthetic instead of just keywords. Our semantic search understands context and finds cards that match your vibe, even if you don't know the exact name.",
        tags: ["New Feature", "AI", "Search"],
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
        date: "November 22, 2025",
        title: "Seller Reputation & Trust Score",
        description: "Build your reputation with our comprehensive trust system. Earn points for fast shipping, accurate descriptions, and positive reviews. Your trust score is prominently displayed on your profile, helping buyers shop with confidence and rewarding reliable sellers.",
        tags: ["New Feature", "Trust & Safety"],
        version: "v1.2.8"
    },
    {
        date: "November 22, 2025",
        title: "Dispute Resolution Center",
        description: "Built-in dispute management system for handling issues professionally. File disputes for non-delivery, item condition, or other concerns. AI-powered case analysis provides recommended resolutions, while admin review ensures fair outcomes for complex cases.",
        tags: ["New Feature", "Trust & Safety"],
        version: "v1.2.7"
    },
    {
        date: "November 21, 2025",
        title: "Direct Messaging System",
        description: "Secure in-platform messaging between buyers and sellers. Ask questions, negotiate details, and share photos without leaving 6Seven. Real-time notifications, message threading, and conversation history keep everything organized.",
        tags: ["New Feature", "Communication"],
        version: "v1.2.5"
    },
    {
        date: "November 21, 2025",
        title: "Portfolio Tracker",
        description: "Track your collection's value over time with automatic portfolio snapshots. Monitor total value, diversification score, and portfolio health. See which cards are appreciating and get insights on your top holdings. Perfect for serious collectors and investors.",
        tags: ["New Feature", "Analytics"],
        version: "v1.2.4"
    },
    {
        date: "November 20, 2025",
        title: "AI Listing Engine",
        description: "We've revolutionized how you list cards. Our new AI Listing Engine uses advanced computer vision to automatically identify your card, grade, and set from a single photo. It pre-fills all the details, making listing 10x faster.",
        tags: ["New Feature", "AI"],
        version: "v1.2.0"
    },
    {
        date: "November 20, 2025",
        title: "Dynamic Price Suggestions",
        description: "Get instant market-based pricing with our AI price suggestion engine. Analyzes recent sales, condition, rarity, and demand to recommend optimal pricing. Shows price ranges from conservative to ambitious, helping you price competitively while maximizing profit.",
        tags: ["New Feature", "AI", "Pricing"],
        version: "v1.2.0"
    },
    {
        date: "November 18, 2025",
        title: "Stripe Connect Integration",
        description: "Seamless payments powered by Stripe Connect. Sellers receive payouts directly to their bank accounts with transparent fee structure. Buyers pay securely with any major card, Apple Pay, or Google Pay. All transactions are protected with buyer and seller guarantees.",
        tags: ["New Feature", "Payments"],
        version: "v1.1.8"
    },
    {
        date: "November 17, 2025",
        title: "Bulk Import from Collectr",
        description: "Import your entire collection from Collectr with one click. Automatically creates listings from your collection data with smart pricing suggestions. Map your collection categories to 6Seven's marketplace structure and go live in minutes instead of hours.",
        tags: ["New Feature", "Integration", "Seller Tools"],
        version: "v1.1.7"
    },
    {
        date: "November 16, 2025",
        title: "Shipping Carrier Integration",
        description: "Real-time shipping rates from major UK carriers including Royal Mail, DPD, and Evri. Automatic tracking number generation and buyer notifications. Sellers can print labels directly from the dashboard and buyers get live delivery updates.",
        tags: ["New Feature", "Shipping"],
        version: "v1.1.6"
    },
    {
        date: "November 15, 2025",
        title: "Marketplace Expansion",
        description: "6Seven is growing. We've expanded our marketplace to support new categories including sealed product, graded slabs from all major grading companies, and raw vintage cards. The new browse experience makes finding your holy grails easier than ever.",
        tags: ["Expansion", "Marketplace"],
        version: "v1.1.5"
    },
    {
        date: "November 14, 2025",
        title: "Saved Searches & Alerts",
        description: "Never miss a listing again. Save your searches with custom filters and get instant notifications when matching items are listed. Set price alerts, watch specific sets or rarities, and let 6Seven do the hunting for you.",
        tags: ["New Feature", "Notifications"],
        version: "v1.1.3"
    },
    {
        date: "November 12, 2025",
        title: "Review & Rating System",
        description: "Complete feedback system for buyers and sellers. Rate transactions on communication, shipping speed, and item accuracy. Leave detailed reviews with photos. Seller responses and verified purchase badges build trust and transparency.",
        tags: ["New Feature", "Trust & Safety"],
        version: "v1.1.0"
    },
    {
        date: "November 10, 2025",
        title: "Credit System",
        description: "Flexible credit system for refunds, returns, and promotional bonuses. Credits can be used for any purchase on the platform. Track your credit balance, transaction history, and expiration dates in your wallet. Perfect for building buyer loyalty.",
        tags: ["New Feature", "Payments"],
        version: "v1.0.8"
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
