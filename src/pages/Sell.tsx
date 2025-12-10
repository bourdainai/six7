import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Zap, Layers, Camera, ArrowRight, Sparkles, Clock, Check } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { SEO } from "@/components/SEO";
import { SellWizard } from "@/components/sell/SellWizard";
import { cn } from "@/lib/utils";

export default function Sell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check if user wants the quick flow or advanced flow
  const mode = searchParams.get("mode"); // "quick" | "advanced" | null

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  // If mode is quick, show the wizard directly
  if (mode === "quick" && user) {
    return <SellWizard />;
  }

  // If mode is advanced, redirect to old flow
  if (mode === "advanced") {
    navigate("/sell/advanced");
    return null;
  }

  return (
    <PageLayout>
      <SEO
        title="Sell Pokemon Cards | 6Seven"
        description="List your Pokemon cards in seconds with AI-powered pricing and instant publishing."
      />

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => setAuthModalOpen(false)}
      />

      <div className="container max-w-4xl py-8 px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            List your cards in seconds
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Snap a photo, let AI do the rest. The fastest way to sell Pokemon cards.
          </p>
        </div>

        {/* Choose Your Flow */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Quick List Card */}
          <Card
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-primary",
              "border-2"
            )}
            onClick={() => {
              if (user) {
                setSearchParams({ mode: "quick" });
              } else {
                setAuthModalOpen(true);
              }
            }}
          >
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500 hover:bg-green-500">
                Recommended
              </Badge>
            </div>

            <CardHeader className="pt-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Quick List</CardTitle>
              <CardDescription className="text-base">
                Snap a photo, AI identifies your card, suggests pricing, and you're live in under 30 seconds.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Camera, text: "Camera-first flow" },
                  { icon: Sparkles, text: "AI card identification" },
                  { icon: Clock, text: "List in under 30 seconds" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full h-12 text-base" size="lg">
                Start Quick List
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Advanced List Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-md border-2"
            onClick={() => navigate("/sell/advanced")}
          >
            <CardHeader className="pt-8">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Layers className="h-7 w-7 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Advanced Listing</CardTitle>
              <CardDescription className="text-base">
                Full control over every detail. List multiple cards, bundles, sealed products, and accessories.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3 mb-6">
                {[
                  { text: "Multi-card bundles" },
                  { text: "All product categories" },
                  { text: "Detailed specifications" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full h-12 text-base" size="lg">
                Advanced Listing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 p-6 rounded-2xl bg-muted/50 mb-12">
          {[
            { value: "30s", label: "Average list time" },
            { value: "95%", label: "AI accuracy" },
            { value: "0%", label: "Listing fees" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">How Quick List Works</h2>
          <p className="text-muted-foreground">Three simple steps to list your card</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: 1,
              title: "Snap a Photo",
              description: "Use your camera or upload an image of your card",
              icon: Camera,
            },
            {
              step: 2,
              title: "AI Does the Work",
              description: "We identify your card, suggest a price, and fill in details",
              icon: Sparkles,
            },
            {
              step: 3,
              title: "Confirm & Publish",
              description: "Review the listing and go live with one tap",
              icon: Check,
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-sm font-medium text-primary mb-1">Step {item.step}</div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
