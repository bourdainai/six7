import { Camera, Brain, DollarSign, Search, ShieldCheck, Zap } from "lucide-react";
import aiFeatureImage from "@/assets/ai-feature.jpg";

const features = [
  {
    icon: Camera,
    title: "Photo to Listing",
    description: "Upload photos, AI extracts category, brand, size, color, condition, and generates descriptions instantly.",
  },
  {
    icon: Brain,
    title: "Smart Pricing",
    description: "AI analyzes market data, brand value, condition, and seasonality to suggest optimal prices.",
  },
  {
    icon: Search,
    title: "Semantic Discovery",
    description: "Buyers find items through natural language search and AI-curated personalized feeds.",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    description: "Buyer agents continuously match new listings to user preferences, sizes, and budgets.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    description: "AI-powered fraud detection, dispute resolution, and authenticity verification.",
  },
  {
    icon: DollarSign,
    title: "Bundle Optimization",
    description: "Smart suggestions for multi-item bundles that save on shipping and increase value.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-6 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            AI-First, Always
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every feature is designed to work smarter, not harder. This isn't a bolt-on—it's AI-native from the ground up.
          </p>
        </div>

        {/* AI Feature Highlight */}
        <div className="mb-20 rounded-3xl overflow-hidden shadow-large border border-border">
          <img 
            src={aiFeatureImage} 
            alt="AI analyzing fashion" 
            className="w-full h-64 object-cover"
          />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
