import { Upload, Sparkles, TrendingUp, Package } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Take 1-5 photos of your item from different angles.",
    step: "01",
  },
  {
    icon: Sparkles,
    title: "Analyze",
    description: "AI identifies, extracts details, and writes descriptions.",
    step: "02",
  },
  {
    icon: TrendingUp,
    title: "Price",
    description: "Get AI suggestions with sell probability estimates.",
    step: "03",
  },
  {
    icon: Package,
    title: "Sell",
    description: "Review, adjust, publish. Buyers matched instantly.",
    step: "04",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-32 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-20">
          <h2 className="text-5xl md:text-6xl font-light mb-6 text-foreground leading-tight">
            Four Steps.
            <br />
            <span className="font-medium">Zero Friction.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            From photo to sale. No tedious forms, no pricing guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="flex flex-col">
                {/* Step number */}
                <div className="text-7xl font-extralight text-foreground/10 mb-6 group-hover:text-foreground/20 transition-colors">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6 group-hover:border-foreground transition-colors">
                  <step.icon className="w-5 h-5 text-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-medium mb-2 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{step.description}</p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-24 left-full w-full h-px bg-border/50 -z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
