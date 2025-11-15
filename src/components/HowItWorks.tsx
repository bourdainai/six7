import { Upload, Sparkles, TrendingUp, Package } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Photos",
    description: "Take or upload 1-5 photos of your item from different angles.",
    step: "01",
  },
  {
    icon: Sparkles,
    title: "AI Analyzes",
    description: "Our AI instantly identifies the item, extracts details, and writes a compelling description.",
    step: "02",
  },
  {
    icon: TrendingUp,
    title: "Smart Pricing",
    description: "Get AI-suggested prices with sell probability and time estimates for each price point.",
    step: "03",
  },
  {
    icon: Package,
    title: "Publish & Sell",
    description: "Review, adjust if needed, and publish. Buyers get matched instantly through their agents.",
    step: "04",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From photo to sale in four simple steps. No tedious forms, no pricing guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -z-10" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {step.step}
                </div>

                {/* Icon container */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-hero shadow-medium flex items-center justify-center mb-6 mt-4">
                  <step.icon className="w-10 h-10 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
