import { Camera, Brain, Search, Zap, ShieldCheck, Package } from "lucide-react";
import aiFeatureImage from "@/assets/ai-feature.jpg";

const features = [
  {
    icon: Camera,
    title: "Photo to Listing",
    description: "Upload photos. AI extracts card name, set, rarity, condition and generates descriptions instantly.",
  },
  {
    icon: Brain,
    title: "Smart Pricing",
    description: "Real-time pricing comps from TCGPlayer, eBay, and Cardmarket suggest optimal prices.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Natural language queries and AI-curated personalized discovery feeds.",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    description: "Buyer agents continuously match listings to preferences and budgets.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    description: "AI-powered fraud detection and dispute resolution built in.",
  },
  {
    icon: Package,
    title: "Smart Bundles",
    description: "Multi-item suggestions that save shipping and increase value.",
  },
];

export const Features = () => {
  return (
    <section className="py-32 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-20">
          <h2 className="text-5xl md:text-6xl font-light mb-6 text-foreground leading-tight tracking-tight">
            AI-Native
            <br />
            <span className="font-normal">From Day One.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-normal tracking-tight">
            Not a bolt-on. Every feature designed to work smarter, not harder.
          </p>
        </div>

        {/* AI Feature Highlight */}
        <div className="mb-24 overflow-hidden border border-divider-gray">
          <img 
            src={aiFeatureImage} 
            alt="AI analyzing cards" 
            className="w-full h-80 object-cover"
          />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 bg-card border border-divider-gray hover:border-foreground transition-all duration-fast group"
            >
              <feature.icon className="w-8 h-8 text-foreground mb-6 group-hover:opacity-70 transition-opacity duration-fast" strokeWidth={2} />
              <h3 className="text-lg font-normal mb-2 text-foreground tracking-tight">{feature.title}</h3>
              <p className="text-sm text-muted-foreground font-normal leading-relaxed tracking-tight">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
