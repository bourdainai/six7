import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

const changelogData = [
    {
        date: "January 25, 2025",
        title: "6Seven Wallet - Instant Payments & Lower Fees",
        description: "Introducing the 6Seven Wallet system - a game-changer for both buyers and sellers. Deposit funds once and pay instantly for purchases with just 1% fees (vs 3% with cards). Sellers get instant settlements for trades, and buyers can split payments between wallet and card. Built-in credit system for refunds and promotions. Your money moves faster, fees stay lower.",
        tags: ["New Feature", "Payments", "Wallet"],
        version: "v2.0.0"
    },
    {
        date: "January 24, 2025",
        title: "Agentic Commerce Protocol (ACP) - AI Agents Can Now Shop",
        description: "6Seven is the first marketplace where AI agents can autonomously browse, purchase, and complete transactions. Our ACP endpoints enable AI buyers to search products, create checkout sessions, process payments, and confirm orders - all without human intervention. Perfect for automated collection building, portfolio management, and AI-powered reselling operations.",
        tags: ["New Feature", "AI", "Automation", "Platform"],
        version: "v1.9.5"
    },
    {
        date: "January 23, 2025",
        title: "SendCloud Integration - Automated Shipping Labels",
        description: "Full shipping automation is here. Generate print-at-home shipping labels directly from your dashboard with SendCloud integration. Automatic rate calculation, address validation, service point selection, and real-time tracking updates. Bulk label creation for power sellers. Return label generation. Shipping just got 10x easier.",
        tags: ["New Feature", "Shipping", "Automation"],
        version: "v1.9.0"
    },
    {
        date: "January 22, 2025",
        title: "AI-Powered Fake Card Detection",
        description: "Protecting buyers with advanced AI counterfeit detection. Every listing image is automatically scanned for authenticity using computer vision. Suspicious cards trigger video verification requests. Admin review queue with AI-assisted analysis. Confidence scores and detailed issue reports. Shop with confidence knowing every card is verified.",
        tags: ["New Feature", "AI", "Trust & Safety", "Security"],
        version: "v1.8.8"
    },
    {
        date: "January 21, 2025",
        title: "Semantic & Image Search - Find Cards by Description",
        description: "Revolutionary search capabilities that understand context, not just keywords. Describe what you're looking for in natural language - 'a rare Charizard with rainbow foil' - and AI finds it. Upload a photo of a card and find similar listings. Semantic search understands card relationships, set themes, and collector intent. Finding your grail just got magical.",
        tags: ["New Feature", "AI", "Search"],
        version: "v1.8.5"
    },
    {
        date: "January 20, 2025",
        title: "Complete Review & Rating System",
        description: "Comprehensive feedback system with verified purchase badges, photo reviews, and seller responses. Buyers and sellers rate each other independently. Review images, detailed feedback, and response threads build trust. Your reputation is your currency - displayed prominently on profiles and listings.",
        tags: ["New Feature", "Trust & Safety", "Community"],
        version: "v1.8.3"
    },
    {
        date: "January 19, 2025",
        title: "Advanced Dispute Resolution with AI Assistance",
        description: "Professional dispute management powered by AI. File disputes for non-delivery, condition issues, or counterfeits. AI automatically analyzes evidence, suggests resolutions, and prioritizes cases. Admin dashboard with SLA monitoring ensures fast resolution. Both parties can upload evidence, and AI provides fairness recommendations. Disputes resolved faster, more fairly.",
        tags: ["New Feature", "AI", "Trust & Safety"],
        version: "v1.8.0"
    },
    {
        date: "January 18, 2025",
        title: "Real-Time Messaging with AI Reply Suggestions",
        description: "Full-featured messaging system with real-time updates, typing indicators, read receipts, and file attachments. AI-powered reply suggestions help you respond faster. Message safety scanning protects users. Image lightbox, emoji reactions, and conversation search. Communicate seamlessly without leaving the platform.",
        tags: ["New Feature", "AI", "Communication"],
        version: "v1.7.8"
    },
    {
        date: "January 17, 2025",
        title: "Pokémon TCG Database - 10,000+ Cards Auto-Synced",
        description: "Massive Pokémon TCG database with automatic daily syncing from multiple sources. Every card, set, rarity, and attribute pre-loaded. Auto-fill listings from our database. Market price tracking, pricing comps, and set completeness verification. Import from Collectr, TCGdex, and JustTCG. Your collection management just leveled up.",
        tags: ["New Feature", "Data", "Integration"],
        version: "v1.7.5"
    },
    {
        date: "January 16, 2025",
        title: "Seller Analytics Dashboard",
        description: "Deep insights into your selling performance. Track sales metrics, revenue trends, listing performance, and buyer behavior. See which cards sell fastest, optimal pricing windows, and inventory health. Stale inventory alerts with AI recommendations. Data-driven selling decisions at your fingertips.",
        tags: ["New Feature", "Analytics", "Seller Tools"],
        version: "v1.7.3"
    },
    {
        date: "January 15, 2025",
        title: "Auto-Relist Rules & Inventory Automation",
        description: "Set it and forget it. Create automation rules that automatically reduce prices, mark as quick sale, or refresh listings based on days listed, views, or stale risk scores. Your inventory stays fresh and competitive without manual work. Perfect for sellers with large inventories who want to maximize sales velocity.",
        tags: ["New Feature", "Automation", "Seller Tools"],
        version: "v1.7.0"
    },
    {
        date: "January 14, 2025",
        title: "Buyer Agent - AI Shopping Assistant",
        description: "Your personal AI shopping agent that learns your preferences and hunts for deals. Gets price drop alerts, bundle recommendations, and personalized suggestions. Learns from your purchases and feedback. Automatically matches listings to your collection goals and budget. Let AI do the hunting while you focus on collecting.",
        tags: ["New Feature", "AI", "Buyer Tools"],
        version: "v1.6.8"
    },
    {
        date: "January 13, 2025",
        title: "Admin Live Stats & Real-Time Monitoring",
        description: "Real-time platform monitoring for admins. See active users, current transactions, revenue streams, and system health live. Fraud detection dashboard, moderation queue management, and dispute SLA tracking. Complete visibility into platform operations with actionable insights.",
        tags: ["New Feature", "Admin", "Analytics"],
        version: "v1.6.5"
    },
    {
        date: "January 12, 2025",
        title: "Seller Profile Pages & Public Storefronts",
        description: "Every seller gets a beautiful public profile page showcasing their listings, reviews, reputation score, and seller badges. Customize your bio, social links, and storefront appearance. Build your brand and attract repeat buyers. Your profile is your storefront - make it shine.",
        tags: ["New Feature", "Seller Tools", "Profile"],
        version: "v1.6.3"
    },
    {
        date: "January 11, 2025",
        title: "Video Listings - Show Card Condition in Motion",
        description: "Upload video to showcase your cards like never before. Demonstrate holographic effects, show corners and edges, rotate for texture visibility. Video listings get more views and higher conversion rates. Buyers see exactly what they're getting. Your listings stand out with motion.",
        tags: ["New Feature", "Media", "Seller Tools"],
        version: "v1.6.0"
    },
    {
        date: "January 10, 2025",
        title: "Price Drop Alerts & Saved Searches",
        description: "Never miss a deal. Save searches with custom filters and get instant notifications when matching items are listed or prices drop. Set price alerts for specific cards, watch entire sets, and let 6Seven notify you the moment your grail appears. Your collection goals, automated.",
        tags: ["New Feature", "Notifications", "Buyer Tools"],
        version: "v1.5.8"
    },
    {
        date: "January 9, 2025",
        title: "API Key Management for Developers",
        description: "Generate and manage API keys for programmatic access to 6Seven. Perfect for developers building tools, automation scripts, or integrations. Full MCP protocol support for AI agents. Rate limiting, usage monitoring, and scope-based permissions. Build on top of 6Seven's infrastructure.",
        tags: ["New Feature", "Developer", "API"],
        version: "v1.5.5"
    },
    {
        date: "January 8, 2025",
        title: "Seller Verification & Badge System",
        description: "Build trust with verified seller status. Complete email, phone, ID, and business verification. Earn badges for fast shipping, high ratings, and volume sales. Your verification level and badges are prominently displayed, helping buyers shop with confidence. Verified sellers get priority in search results.",
        tags: ["New Feature", "Trust & Safety", "Seller Tools"],
        version: "v1.5.3"
    },
    {
        date: "January 7, 2025",
        title: "Multi-Variant Listings - One Listing, Multiple Conditions",
        description: "List multiple conditions and quantities of the same card in a single listing. Buyers choose their preferred condition with individual pricing and dedicated photos. Streamlines inventory management for sellers with multiple copies. One listing, infinite possibilities.",
        tags: ["New Feature", "Seller Tools", "UX"],
        version: "v1.5.0"
    },
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
                description="See how 6Seven is revolutionizing trading card marketplaces. AI-powered features, automated shipping, wallet payments, trade systems, and more. We ship new capabilities every week - watch us build the future."
            />
            <Navigation />

            <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-12 pb-8 border-b border-border">
                        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Changelog</h1>
                        <p className="text-base text-muted-foreground max-w-2xl">
                            Watch 6Seven evolve in real-time. We ship new features, AI capabilities, and platform improvements every week. 
                            From AI-powered listing tools to automated shipping, from wallet payments to trade systems - see what's new 
                            and what's coming next. This is more than a changelog; it's the story of building the future of trading card marketplaces.
                        </p>
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
