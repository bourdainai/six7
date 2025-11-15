import { Camera, Brain, Search, Zap, ShieldCheck, Package } from "lucide-react";
import aiFeatureImage from "@/assets/ai-feature.jpg";

const features = [
  {
    icon: Camera,
    title: "Photo to Listing",
    description: "Upload photos. AI extracts category, brand, condition and generates descriptions instantly.",
  },
  {
    icon: Brain,
    title: "Smart Pricing",
    description: "Market data analysis suggests optimal prices with sell probability curves.",
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
    <section className="py-32 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-20">
          <h2 className="text-5xl md:text-6xl font-light mb-6 text-foreground leading-tight">
            AI-Native
            <br />
            <span className="font-medium">From Day One.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            Not a bolt-on. Every feature designed to work smarter, not harder.
          </p>
        </div>

        {/* AI Feature Highlight */}
        <div className="mb-24 rounded-lg overflow-hidden shadow-medium">
          <img 
            src={aiFeatureImage} 
            alt="AI analyzing fashion" 
            className="w-full h-80 object-cover"
          />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all group"
            >
              <feature.icon className="w-8 h-8 text-foreground mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-medium mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
